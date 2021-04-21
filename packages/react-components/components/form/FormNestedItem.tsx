import React from "react";
import PropTypes from "prop-types";
import { intlShape } from "@vulcanjs/i18n";
import { useFormComponents } from "./FormComponentsContext";
import { useCoreComponents } from "./CoreComponentsContext";

const FormNestedItemLayout = ({ content, removeButton }) => (
  <div className="form-nested-item">
    <div className="form-nested-item-inner">{content}</div>
    {removeButton && [
      <div key="remove-button" className="form-nested-item-remove">
        {removeButton}
      </div>,
      <div
        key="remove-button-overlay"
        className="form-nested-item-deleted-overlay"
      />,
    ]}
  </div>
);
FormNestedItemLayout.propTypes = {
  content: PropTypes.node.isRequired,
  removeButton: PropTypes.node,
};

const FormNestedItem = (
  {
    nestedFields,
    name,
    path,
    removeItem,
    itemIndex,
    formComponents,
    hideRemove,
    label,
    ...props
  },
  { errors, intl }
) => {
  const CoreComponents = useCoreComponents();
  const FormComponents = useFormComponents();
  const isArray = typeof itemIndex !== "undefined";
  return (
    <FormComponents.FormNestedItemLayout
      content={nestedFields.map((field, i) => {
        return (
          <FormComponents.FormComponent
            key={i}
            {...props}
            {...field}
            path={`${path}.${field.name}`}
            itemIndex={itemIndex}
          />
        );
      })}
      removeButton={
        isArray &&
        !hideRemove && [
          <div key="remove-button" className="form-nested-item-remove">
            <CoreComponents.Button
              className="form-nested-button"
              variant="danger"
              size="sm"
              iconButton
              tabIndex={-1}
              onClick={() => {
                removeItem(name);
              }}
              aria-label={intl.formatMessage(
                { id: "forms.delete_nested_field" },
                { label: label }
              )}
            >
              <FormComponents.IconRemove height={12} width={12} />
            </CoreComponents.Button>
          </div>,
          <div
            key="remove-button-overlay"
            className="form-nested-item-deleted-overlay"
          />,
        ]
      }
    />
  );
};

FormNestedItem.propTypes = {
  path: PropTypes.string.isRequired,
  itemIndex: PropTypes.number,
  formComponents: PropTypes.object,
  hideRemove: PropTypes.bool,
};

FormNestedItem.contextTypes = {
  errors: PropTypes.array,
  intl: intlShape,
};