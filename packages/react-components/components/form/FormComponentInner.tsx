import React, { MouseEventHandler } from "react";
import PropTypes from "prop-types";
import { useIntlContext } from "@vulcanjs/i18n";
import { whitelistInputProps } from "./ui_utils";
/*
import {
  instantiateComponent,
  whitelistInputProps,
} from "meteor/vulcan:core";
*/
import classNames from "classnames";
import { VulcanCoreInput } from "@vulcanjs/schema";
import { PossibleVulcanComponents } from "./defaultVulcanComponents";
import { clearableInputs } from "./inputs/consts";
import { useVulcanComponents } from "./VulcanComponentsContext";

interface FormComponentInnerProps {
  inputType: VulcanCoreInput;
  disabled?: boolean;
  /**
   * Callback called when clicking on the "clear input" button
   */
  clearField?: MouseEventHandler<HTMLButtonElement>;
  handleChange?: Function;
  itemProperties?: any;
  help?: string;
  description?: string;
  loading?: boolean;
  submitForm: any;
  formComponents: PossibleVulcanComponents;
  intlKeys?: any;
  inputClassName: any;
  name: any;
  input: any;
  beforeComponent: any;
  afterComponent: any;
  errors: any;
  showCharsRemaining: any;
  charsRemaining: any;
  renderComponent: any;
  formInput: any;
}

export const FormComponentInner = (props: FormComponentInnerProps) => {
  const intl = useIntlContext();
  const { inputType, disabled, clearField } = props;

  const renderClear = () => {
    if (clearableInputs.includes(inputType) && !disabled) {
      /*
      From bootstrap:
        <Components.TooltipTrigger
          trigger={
            <button
              className="form-component-clear"
              title={this.context.intl.formatMessage({
                id: "forms.clear_field",
              })}
              onClick={this.props.clearField}
            >
              <span>✕</span>
            </button>
          }
        >
          <Components.FormattedMessage id="forms.clear_field" />
        </Components.TooltipTrigger>
        */
      return (
        <button
          className="form-component-clear"
          title={intl.formatMessage({
            id: "forms.clear_field",
          })}
          onClick={clearField}
        >
          <span>✕</span>
        </button>
      );
    }
  };

  const getProperties = () => {
    const {
      handleChange,
      inputType,
      itemProperties,
      help,
      description,
      loading,
      submitForm,
      formComponents,
      intlKeys,
    } = props;
    const properties: FormComponentInnerProps & {
      inputProperties: React.HTMLProps<HTMLInputElement>;
      itemProperties: any; // TODO
    } = {
      ...props,

      inputProperties: {
        ...whitelistInputProps(props),
        onChange: (event) => {
          // FormComponent's handleChange expects value as argument; look in target.checked or target.value
          const inputValue =
            inputType === "checkbox"
              ? // TODO: not sure why we need an ignore there
                // @ts-ignore
                event.target.checked
              : // @ts-ignore
                event.target.value;
          handleChange(inputValue);
        },
        onKeyPress: (event) => {
          if (event.key === "Enter" && inputType !== "textarea") {
            submitForm();
          }
        },
      },

      itemProperties: {
        ...itemProperties,
        intlKeys,
        Components: formComponents,
        description: description || help,
        loading,
      },
    };
    return properties;
  };

  const {
    inputClassName,
    name,
    input,
    //inputType,
    beforeComponent,
    afterComponent,
    errors,
    showCharsRemaining,
    charsRemaining,
    renderComponent,
    formInput,
  } = props;

  const FormComponents = useVulcanComponents();
  //const FormComponents = formComponents;

  const hasErrors = errors && errors.length;

  const inputName = typeof input === "function" ? input.name : inputType;
  const inputClass = classNames(
    "form-input",
    inputClassName,
    `input-${name}`,
    `form-component-${inputName || "default"}`,
    {
      "input-error": hasErrors,
    }
  );
  const properties = getProperties();

  const FormInput = formInput;

  return (
    <div className={inputClass}>
      {/*instantiateComponent(beforeComponent, properties)*/}
      <FormInput {...properties} />
      {hasErrors ? <FormComponents.FieldErrors errors={errors} /> : null}
      {renderClear()}
      {showCharsRemaining && (
        <div
          className={classNames("form-control-limit", {
            danger: charsRemaining < 10,
          })}
        >
          {charsRemaining}
        </div>
      )}
      {/*instantiateComponent(afterComponent, properties)*/}
    </div>
  );
};