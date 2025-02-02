// Code generated by go-swagger; DO NOT EDIT.

package models

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"context"

	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
)

// EKS e k s
//
// swagger:model EKS
type EKS struct {

	// The Access key ID used to authenticate against AWS.
	AccessKeyID string `json:"accessKeyID,omitempty"`

	// Defines the ARN for an IAM role that should be assumed when handling resources on AWS. It will be used
	// to acquire temporary security credentials using an STS AssumeRole API operation whenever creating an AWS session.
	AssumeRoleARN string `json:"assumeRoleARN,omitempty"`

	// An arbitrary string that may be needed when calling the STS AssumeRole API operation.
	// Using an external ID can help to prevent the "confused deputy problem".
	AssumeRoleExternalID string `json:"assumeRoleExternalID,omitempty"`

	// If datacenter is set, this preset is only applicable to the
	// configured datacenter.
	Datacenter string `json:"datacenter,omitempty"`

	// Only enabled presets will be available in the KKP dashboard.
	Enabled bool `json:"enabled,omitempty"`

	// IsCustomizable marks a preset as editable on the KKP UI; Customizable presets still have the credentials obscured on the UI, but other fields that are not considered private are displayed during cluster creation. Users can then update those fields, if required.
	// NOTE: This is only supported for OpenStack Cloud Provider in KKP 2.26. Support for other providers will be added later on.
	IsCustomizable bool `json:"isCutomizable,omitempty"`

	// The Secret Access Key used to authenticate against AWS.
	SecretAccessKey string `json:"secretAccessKey,omitempty"`
}

// Validate validates this e k s
func (m *EKS) Validate(formats strfmt.Registry) error {
	return nil
}

// ContextValidate validates this e k s based on context it is used
func (m *EKS) ContextValidate(ctx context.Context, formats strfmt.Registry) error {
	return nil
}

// MarshalBinary interface implementation
func (m *EKS) MarshalBinary() ([]byte, error) {
	if m == nil {
		return nil, nil
	}
	return swag.WriteJSON(m)
}

// UnmarshalBinary interface implementation
func (m *EKS) UnmarshalBinary(b []byte) error {
	var res EKS
	if err := swag.ReadJSON(b, &res); err != nil {
		return err
	}
	*m = res
	return nil
}
