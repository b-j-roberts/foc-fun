import { useState, useEffect } from "react";

import { parseStarknetType } from "../../abi/parser";

export const ContractInputPrimitive = (props: any) => {
  return (
    <div className="flex flex-row items-center ml-[2rem]">
      <input
        className="Form__text text-[2rem] pl-[1rem] pt-[0.5rem]"
        type="text"
        id={props.type.type}
        placeholder={props.name}
      />
      <button
        className="Button__like px-[0.5rem] pt-[0.5rem] ml-[1rem]"
        style={{ backgroundColor: props.type.color }}
      >
        {props.type.type}
      </button>
    </div>
  );
}

export const ContractInputArray = (props: any) => {
  // TODO: Try with array of structs
  const [inputItemsPlaceholders, setInputItemsPlaceholders] = useState<any>([]);
  return (
    <div className="flex flex-col gap-[0.5rem] ml-[2rem]">
      <div className="flex flex-row items-center">
        <p className="text-[2rem] pt-[0.5rem]">{props.name}</p>
        <button
          className="Button__like px-[0.5rem] pt-[0.5rem] ml-[1rem]"
          style={{ backgroundColor: props.type.color }}
        >
          array&lt;{props.type.type}&gt;
        </button>
        <button
          className="Button__empty px-[0.5rem] ml-[1rem] text-[3rem] h-[2.5rem]"
          onClick={() => setInputItemsPlaceholders([...inputItemsPlaceholders, `${props.name} ${inputItemsPlaceholders.length}`])}
        >
          +
        </button>
      </div>
      {inputItemsPlaceholders.map((item: any, index: number) => (
        <div key={index} className="flex flex-row items-center ml-[2rem]">
          <input
            className="Form__text text-[2rem] pl-[1rem] pt-[0.5rem]"
            type="text"
            id={props.type.type}
            placeholder={item}
          />
          <button
            className="Button__like px-[0.5rem] pt-[0.5rem] ml-[1rem]"
            style={{ backgroundColor: props.type.color }}
          >
            {props.type.type}
          </button>
          <button
            className="Button__empty px-[0.5rem] ml-[1rem] text-[3rem] h-[2.5rem]"
            onClick={() => setInputItemsPlaceholders(inputItemsPlaceholders.slice(0, -1))}
          >
            -
          </button>
        </div>
      ))}
    </div>
  );
}

export const ContractInputStruct = (props: any) => {
  return (
    <div className="flex flex-col gap-[0.5rem] ml-[2rem]">
      <div className="flex flex-row items-center">
        <p className="text-[2rem] pt-[0.5rem]">{props.name}</p>
        <button
          className="Button__like px-[0.5rem] pt-[0.5rem] ml-[1rem]"
          style={{ backgroundColor: props.type.color }}
        >
          {props.type.type}
        </button>
      </div>
      {props.type.fields && props.type.fields.map((field: any, index: number) => (
        <div key={index}>
          {field.type.kind === "primitive" && (
            <ContractInputPrimitive type={field.type} name={field.name} />
          )}
          {field.type.kind === "array" && (
            <ContractInputArray type={field.type} name={field.name} />
          )}
          {field.type.kind === "struct" && (
            <ContractInputStruct type={field.type} name={field.name} />
          )}
        </div>
      ))}
    </div>
  );
}

export const ContractInput = (props: any) => {
  const [inputType, setInputType] = useState<any>(null);
  useEffect(() => {
    const newInputType = parseStarknetType(props.input.type, props.abi);
    setInputType(newInputType);
  }, [props.input, props.abi]);

  // TODO: Custom input types for each type
  //       e.g. for u256 we can have a hex, decimal, etc
  return (
    <div className="flex flex-col m-0 p-0">
      {inputType && inputType.kind === "primitive" && (
        <ContractInputPrimitive type={inputType} name={props.input.name} />
      )}
      {inputType && inputType.kind === "array" && (
        <ContractInputArray type={inputType} name={props.input.name} />
      )}
      {inputType && inputType.kind === "struct" && (
        <ContractInputStruct type={inputType} name={props.input.name} />
      )}
    </div>
  );
}
