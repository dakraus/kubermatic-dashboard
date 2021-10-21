// Copyright 2020 The Kubermatic Kubernetes Platform contributors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {GoogleAnalyticsService} from '@app/google-analytics.service';
import {ClusterService} from '@core/services/cluster';
import {NotificationService} from '@core/services/notification';
import {UserService} from '@core/services/user';
import {ConfirmationDialogComponent} from '@shared/components/confirmation-dialog/component';
import {Cluster} from '@shared/entity/cluster';
import {Member} from '@shared/entity/member';
import {NodeMetrics} from '@shared/entity/metrics';
import {getOperatingSystem, getOperatingSystemLogoClass, Node} from '@shared/entity/node';
import {GroupConfig} from '@shared/model/Config';
import {ClusterHealthStatus} from '@shared/utils/health-status/cluster-health-status';
import {NodeHealthStatus} from '@shared/utils/health-status/node-health-status';
import {MemberUtils, Permission} from '@shared/utils/member-utils/member-utils';
import {NodeUtils} from '@shared/utils/node-utils/node-utils';
import _ from 'lodash';
import * as semver from 'semver';
import {Subject} from 'rxjs';
import {filter, switchMap, take, takeUntil} from 'rxjs/operators';

enum Column {
  stateArrow = 'stateArrow',
  status = 'status',
  name = 'name',
  kubeletVersion = 'kubeletVersion',
  ipAddresses = 'ipAddresses',
  creationDate = 'creationDate',
  actions = 'actions',
}

enum ToggleableColumn {
  nodeDetails = 'nodeDetails',
}

@Component({
  selector: 'km-node-list',
  templateUrl: 'template.html',
  styleUrls: ['style.scss'],
})
export class NodeListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() cluster: Cluster;
  @Input() nodes: Node[] = [];
  @Input() nodesMetrics: Map<string, NodeMetrics> = new Map<string, NodeMetrics>();
  @Input() projectID: string;
  @Output() deleteNode = new EventEmitter<Node>();
  @Input() clusterHealthStatus: ClusterHealthStatus;
  @Input() isClusterRunning: boolean;

  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  config: MatDialogConfig = {
    disableClose: false,
    hasBackdrop: true,
  };
  isShowNodeItem = [];
  dataSource = new MatTableDataSource<Node>();

  readonly toggleableColumns: ToggleableColumn[] = [ToggleableColumn.nodeDetails];
  readonly displayedColumns: Column[] = Object.values(Column);
  readonly column = Column;
  readonly toggleableColumn = ToggleableColumn;

  private _user: Member;
  private _currentGroupConfig: GroupConfig;
  private _unsubscribe = new Subject<void>();

  constructor(
    private readonly _matDialog: MatDialog,
    private readonly _clusterService: ClusterService,
    private readonly _userService: UserService,
    private readonly _googleAnalyticsService: GoogleAnalyticsService,
    private readonly _notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.dataSource.data = this.nodes;
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.sort.active = Column.name;
    this.sort.direction = 'asc';

    this._userService.currentUser.pipe(take(1)).subscribe(user => (this._user = user));

    this._userService
      .getCurrentUserGroup(this.projectID)
      .subscribe(userGroup => (this._currentGroupConfig = this._userService.getCurrentUserGroupConfig(userGroup)));

    this._userService.currentUserSettings.pipe(takeUntil(this._unsubscribe)).subscribe(settings => {
      this.paginator.pageSize = settings.itemsPerPage;
      this.dataSource.paginator = this.paginator; // Force refresh.
    });
  }

  ngOnChanges(): void {
    this.onSortChange(this.dataSource.sort);
  }

  ngOnDestroy(): void {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }

  onSortChange(sort: Sort): void {
    let data = this.nodes;
    if (!sort || !sort.active || sort.direction === '') {
      this.dataSource.data = data;
      return;
    }

    const compare = (a: number | string, b: number | string, isAsc: boolean) => (a < b ? -1 : 1) * (isAsc ? 1 : -1);

    data = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case Column.name:
          return compare(a.name, b.name, isAsc);
        case Column.kubeletVersion:
          return semver.compare(a.spec.versions.kubelet, b.spec.versions.kubelet) * (isAsc ? 1 : -1);
        case Column.creationDate:
          return (a.creationTimestamp.valueOf() < b.creationTimestamp.valueOf() ? 1 : -1) * (isAsc ? 1 : -1);
        default:
          return 0;
      }
    });

    this.dataSource.data = data;
  }

  getVersionHeadline(type: string, isKubelet: boolean): string {
    return Cluster.getVersionHeadline(type, isKubelet);
  }

  canDelete(): boolean {
    return MemberUtils.hasPermission(this._user, this._currentGroupConfig, 'nodes', Permission.Delete);
  }

  deleteNodeDialog(node: Node, event: Event): void {
    event.stopPropagation();
    const dialogConfig: MatDialogConfig = {
      disableClose: false,
      hasBackdrop: true,
      data: {
        title: 'Delete Node',
        message: `Are you sure you want to permanently delete node ${node.name}?`,
        confirmLabel: 'Delete',
      },
    };

    const dialogRef = this._matDialog.open(ConfirmationDialogComponent, dialogConfig);
    this._googleAnalyticsService.emitEvent('clusterOverview', 'deleteNodeDialogOpened');

    dialogRef
      .afterClosed()
      .pipe(filter(isConfirmed => isConfirmed))
      .pipe(switchMap(_ => this._clusterService.deleteNode(this.projectID, this.cluster.id, node.id)))
      .pipe(take(1))
      .subscribe(() => {
        this._notificationService.success(`The ${node.name} node was removed from the ${this.cluster.name} cluster`);
        this._googleAnalyticsService.emitEvent('clusterOverview', 'nodeDeleted');
        this.deleteNode.emit(node);
      });
  }

  getNodeHealthStatus(n: Node): NodeHealthStatus {
    return NodeHealthStatus.getHealthStatus(n);
  }

  getFormattedNodeMemory(memory: string): string {
    return NodeUtils.getFormattedNodeMemory(memory);
  }

  getAddresses(node: Node): object {
    return NodeUtils.getAddresses(node);
  }

  showInfo(node: Node): boolean {
    return node.name !== node.id.replace('machine-', '') && node.id !== '';
  }

  getInfo(node: Node): string {
    if (node.spec.cloud.aws) {
      return node.name;
    }
    return node.id.replace('machine-', '');
  }

  getNodeName(node: Node): string {
    return node.id.replace('machine-', '');
  }

  displayTags(tags: object): boolean {
    return !!tags && Object.keys(tags).length > 0;
  }

  toggleNodeItem(element: Node): void {
    const elem = event.target as HTMLElement;
    const className = elem.className;
    if (className !== 'km-copy') {
      this.isShowNodeItem[element.id] = !this.isShowNodeItem[element.id];
    }
  }

  getSystem(node: Node): string {
    return getOperatingSystem(node.spec);
  }

  getSystemLogoClass(node: Node): string {
    return getOperatingSystemLogoClass(node.spec);
  }

  isPaginatorVisible(): boolean {
    return !_.isEmpty(this.nodes) && this.paginator && this.nodes.length > this.paginator.pageSize;
  }

  getMetrics(nodeName: string): NodeMetrics | undefined {
    return this.nodesMetrics.get(nodeName);
  }
}
