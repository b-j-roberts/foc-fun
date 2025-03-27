import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAccount, useProvider } from "@starknet-react/core";

import { ContractInput } from "./ContractInput";
import { declareIfClass } from "../../contract/calls";
import { fullSetupCall } from "../../contract/registry";
import { addContractClass } from "../../api/registry";

import upload from "../../../public/icons/upload.png";
import uploaded from "../../../public/icons/uploaded.png";
import copy from "../../../public/icons/copy.png";
import { cairo, CallData, hash, json } from "starknet";
import { parseStarknetType } from "@/abi/parser";
// import edit from "../../../public/icons/edit.png";

// TODO: no compiled_contract_class.json?
// TODO: Issue where bg turns white when selecting input text from dropdown
// TODO: Save config option
// TODO: Load config option
// TODO: Bug when switching to contract w/ no calldata from one w/ calldata
// TODO: Deploy: 
//        - Check all inputs are filled & valid
//        - Send to Registry w/ hash of all data & contract hash
//        - Send to backend w/ hash of all data & contract hash
// TODO: Voyager links on class hash & contract address
// TODO: Shorten class hash & contract address & add copy button
export default function EngineDeploy() {
  const { account } = useAccount();
  const contractClassRef = useRef<HTMLInputElement>(null);
  const compiledContractRef = useRef<HTMLInputElement>(null);
  const [contractClassFile, setContractClassFile] = useState<File | null>(null);
  const [compiledContractFile, setCompiledContractFile] = useState<File | null>(null);

  const [contractClassData, setContractClassData] = useState<any | null>(null);
  const [compiledContractData, setCompiledContractData] = useState<any | null>(null);
  const [contractAbi, setContractAbi] = useState<any[]>([]);
  const [constructorInputs, setConstructorInputs] = useState<any[]>([]);

  // TODO: Try with array of structs
  const [inputItemsPlaceholders, setInputItemsPlaceholders] = useState<any>([]);

  const handleContractClassFileChange = (e: any) => {
    if (!e.target) return;
    const file = e.target.files[0];
    console.log("Handling contract class file change...");
    setContractClassFile(file);
  }
  const handleCompiledContractFileChange = (e: any) => {
    if (!e.target) return;
    const file = e.target.files[0];
    console.log("Handling compiled contract file change...");
    setCompiledContractFile(file);
  }
  useEffect(() => {
    // Parse the file
    if (!contractClassFile) return;
    contractClassFile.text().then((text) => {
      const jsonData = JSON.parse(text.toString());
      setContractClassData(jsonData);
      if (!jsonData.abi || jsonData.abi.length === 0) return;
      const abi = jsonData.abi;
      setContractAbi(abi);
      const constructorInputs = abi.find((item: any) => item.type === "constructor")?.inputs;
      if (!constructorInputs) return;
      setConstructorInputs(constructorInputs);
    });
  }, [contractClassFile]);
  useEffect(() => {
    // Parse the file
    if (!compiledContractFile) return;
    compiledContractFile.text().then((text) => {
      const jsonData = JSON.parse(text.toString());
      setCompiledContractData(jsonData);
    });
  }, [compiledContractFile]);

  const handleFileDragOver = (e: any) => {
    e.preventDefault();
  }

  const [deployedContractClassHash, setDeployedContractClassHash] = useState<string | null>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [shortDeployedContractClassHash, setShortDeployedContractClassHash] = useState<string | null>(null);
  const [shortDeployedContractAddress, setShortDeployedContractAddress] = useState<string | null>(null);
  useEffect(() => {
    if (!deployedContractClassHash) return;
    setShortDeployedContractClassHash(deployedContractClassHash.slice(0, 8) + "..." + deployedContractClassHash.slice(-8));
  }, [deployedContractClassHash]);
  useEffect(() => {
    if (!deployedContractAddress) return;
    setShortDeployedContractAddress(deployedContractAddress.slice(0, 8) + "..." + deployedContractAddress.slice(-8));
  }, [deployedContractAddress]);
  const [contractClassName, setContractClassName] = useState<string>("");
  const [contractClassVersion, _setContractClassVersion] = useState<string>("v0.0.0");
  
  const validateInputTypes = (): { isValid: boolean, values: any[] } => {
    const values: any[] = [];
    const isValid = constructorInputs?.every((input, id) => {
      const parsedType = parseStarknetType(input?.type, contractAbi)?.type;
      const parsedKind = parseStarknetType(input?.type, contractAbi)?.kind;
      if (parsedKind === 'array') {
        const arrayValues: any[] = [];
        const isArrayValid = inputItemsPlaceholders.every((_: any, pos: number) => {
          const inputElement = document.getElementById(`${id}-${parsedType}-${pos}`) as HTMLInputElement;
          const inputValue = inputElement?.value;
          if (!inputValue) return false;

          const isValid = validateInputValue(parsedType, inputValue);
          if (isValid) {
            arrayValues.push(inputValue);
          }
          return isValid;
        });
        if (isArrayValid) {
          values.push(arrayValues);
        }
        return isArrayValid;
      } else {
        const inputElement = document.getElementById(`${id}-${parsedType}`) as HTMLInputElement;
        const inputValue = inputElement?.value;
        if (!inputValue) return false; // Ensure input is not empty

        const isValid = validateInputValue(parsedType, inputValue);
        if (isValid) {
          values.push(inputValue);
        }
        return isValid;
      }
    }) ?? false;
    return { isValid, values };
  };
  
  const validateInputValue = (parsedType: string, inputValue: string): boolean => {
    // Validate ByteArray string
    if (parsedType === "string") {
      if (typeof inputValue !== "string" || inputValue.length === 0) return false;
      try {
        const encoded = new TextEncoder().encode(inputValue);
        const decoded = new TextDecoder().decode(encoded);
        return decoded === inputValue;
      } catch (error) {
        return false;
      }
    }
  
    // Validate felt252
    if (parsedType === "felt") {
      if (isNaN(Number(inputValue))) return false;
      try {
        const num = BigInt(inputValue);
        const P = (BigInt(2) ** BigInt(251)) + (BigInt(17) * (BigInt(2) ** BigInt(192))) + BigInt(1);
        return num >= BigInt(0) && num < P;
      } catch (error) {
        return false;
      }
    }
  
    // Validate unsigned integer types (u8, u16, u32, u64, u128, u256)
    const uintBitSizes: { [key: string]: number } = {
      u8: 8,
      u16: 16,
      u32: 32,
      u64: 64,
      u128: 128,
      u256: 256
    };
  
    if (parsedType in uintBitSizes) {
      if (isNaN(Number(inputValue))) return false;
      try {
        const num = BigInt(inputValue);
        const maxValue = BigInt(2) ** BigInt(uintBitSizes[parsedType]);
        return num >= BigInt(0) && num < maxValue;
      } catch (error) {
        return false;
      }
    }
  
    // Validate signed integer types (i8, i16, i32, i64, i128)
    const intBitSizes: { [key: string]: number } = {
      i8: 8,
      i16: 16,
      i32: 32,
      i64: 64,
      i128: 128
    };
  
    if (parsedType in intBitSizes) {
      if (isNaN(Number(inputValue))) return false;
      try {
        const num = BigInt(inputValue);
        const minValue = -(BigInt(2) ** BigInt(intBitSizes[parsedType] - 1));
        const maxValue = (BigInt(2) ** BigInt(intBitSizes[parsedType] - 1)) - BigInt(1);
        return num >= minValue && num <= maxValue;
      } catch (error) {
        return false;
      }
    }
  
    // Validate booleans
    if (parsedType === "bool") {
      return inputValue === "true" || inputValue === "false";
    }
  
    // Validate Contract address
    if (parsedType === "address") {
      const starknetAddressRegex = /^0x[0-9a-fA-F]{64}$/;
      return starknetAddressRegex.test(inputValue);
    }
  
    return true; // Default to true for unknown types
  };

  const deploy = async () => {
    if (!account) return;
    console.log("Declaring & Deploying contract...");

    if (!validateInputTypes()?.isValid) return;

    const callData: any = validateInputTypes()?.values;
    
    const result = await declareIfClass(account, contractClassData, compiledContractData);
    console.log("Class Hash: ", result);
    setDeployedContractClassHash(result.classHash);
    const addContractRes = await addContractClass(result.classHash, contractClassRef.current?.files?.[0] as File);
    console.log("Add contract result: ", addContractRes);
    // TODO: Wait for class to be declared on chain

    // Get all events to register
    const eventsData = contractAbi.find((item: any) => item.type === "event" &&
      item.name.endsWith("::Event"));
    if (!eventsData) return;
    const eventsToRegister = eventsData.variants.map((event: any) => {
      return hash.getSelectorFromName(event.name);
    });
    console.log("Events to register: ", eventsToRegister);
    // TODO: Do deployAndRegisterCall if class already registered?
    const fullSetupRes = await fullSetupCall(account, result.classHash, contractClassName, contractClassVersion, callData, eventsToRegister);
    console.log("Full setup result: ", fullSetupRes);
    // TODO: Replace with event wss listener
    let attempts = 0;
    let receipt = null;
    while (!receipt && attempts < 5) {
      // Try the above call till it returns a receipt ( it fails if the tx is not mined yet )
      console.log("Waiting for receipt...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        receipt = await account.getTransactionReceipt(fullSetupRes.transaction_hash) as any;
      } catch (err) {
        console.log("Error getting transaction receipt: ", err);
      }
      attempts++;
    }
    if (!receipt) {
      console.log("Transaction not mined yet.");
      return;
    }
    console.log("Receipt: ", receipt);
    const deployedEvent = "0x206ba27d5bbda42a63e108ee1ac7a6455c197ee34cd40a268e61b06f78dbc9a";
    if (!receipt || !receipt.events) {
      console.log("No receipt found");
      return;
    }
    const deployedEventData = receipt.events.find((event: any) => event.keys[0] === deployedEvent);
    if (!deployedEventData) {
      console.log("No deployed event found");
      return;
    }
    setDeployedContractAddress(contractAddress);
  }

  const saveDeployment = async () => {
    console.log(contractAbi);
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <h1 className="text-[3.2rem] m-8">Starknet Contract Deployer</h1>
      <div className="w-full flex-grow flex flex-row items-center p-[2rem] gap-[2rem]">
        <div className="h-full w-[30%] gap-[2rem] flex flex-col">
          <div className="h-[40%] Form__input">
          <label
            className="Form__file"
            htmlFor="file-contract"
            onDrop={handleContractClassFileChange}
            onDragOver={handleFileDragOver}
          >
            {contractClassFile ? (
              <div className="flex flex-col items-center justify-center w-full h-full gap-1 relative overflow-hidden">
                <Image src={uploaded} alt="Uploaded" className="w-[10rem] h-[10rem] m-6" />
                <p className="text-[2rem] text-center p-[1rem] pb-0">Contract Uploaded</p>
                <p className="text-[1.2rem] text-center p-0">Filename: {contractClassFile.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                <Image src={upload} alt="Upload" className="w-[10rem] h-[10rem] m-6" />
                <p className="text-[2rem] text-center p-[2rem] pb-0">Upload a `.contract_class.json`</p>
              </div>
            )}
          </label>
          <input
            type="file"
            id="file-contract"
            accept="contract_class.json"
            ref={contractClassRef}
            style={{ display: "none" }}
            onChange={handleContractClassFileChange}
          />
        </div>
        <div className="h-[40%] Form__input">
          <label
            className="Form__file"
            htmlFor="file-compiled"
            onDrop={handleCompiledContractFileChange}
            onDragOver={handleFileDragOver}
          >
            {compiledContractFile ? (
              <div className="flex flex-col items-center justify-center w-full h-full gap-1 relative overflow-hidden">
                <Image src={uploaded} alt="Uploaded" className="w-[10rem] h-[10rem] m-6" />
                <p className="text-[2rem] text-center p-[1rem] pb-0">Compiled Contract Uploaded</p>
                <p className="text-[1.2rem] text-center p-0">Filename: {compiledContractFile.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                <Image src={upload} alt="Upload" className="w-[10rem] h-[10rem] m-6" />
                <p className="text-[2rem] text-center p-[2rem] pb-0">Upload a `.compiled_contract_class.json`</p>
              </div>
            )}
          </label>
          <input
            type="file"
            id="file-compiled"
            accept="compiled_contract_class.json"
            ref={compiledContractRef}
            style={{ display: "none" }}
            onChange={handleCompiledContractFileChange}
          />
        </div>
        </div>
        <div className="flex flex-col w-[70%] justify-center">
          {contractClassFile ? (
            <div>
              <div className="flex flex-row items-center gap-2">
                <h2 className="text-[2.4rem]">Deployment Config :</h2>
                <input
                  className="Form__text text-[2rem] ml-[1rem] pl-[1rem] pt-[0.5rem] mb-[1rem]"
                  type="text"
                  id="contractName"
                  placeholder="Contract Name"
                  onChange={(e) => setContractClassName(e.target.value)}
                />
              </div>
              {constructorInputs && constructorInputs.length > 0 && (
                <div>
                <h2 className="text-[2.4rem]">Constructor :</h2>
                <div className="flex flex-col gap-4 h-[40rem] overflow-y-scroll bg-[#000000a0] rounded-xl w-min py-[1rem] pr-[2rem]
                  border-[2px] border-[var(--foreground)]">
                  {constructorInputs.map((input: any, idx: number) => (
                    <ContractInput
                      key={idx} id={idx} 
                      input={input} 
                      inputItemsPlaceholders={inputItemsPlaceholders} 
                      setInputItemsPlaceholders={setInputItemsPlaceholders} 
                      abi={contractAbi} 
                    />
                  ))}
                </div>
                </div>
              )}
              <div className="flex flex-row">
                <button
                  className="Button__secondary px-[1rem] py-[0.5rem] pt-[1rem] mt-[1rem]"
                  onClick={deploy}
                >
                  Deploy
                </button>
                <button className="Button__secondary px-[1rem] py-[0.5rem] pt-[1rem] mt-[1rem] ml-[1rem]" onClick={saveDeployment}>Save</button>
                <button className="Button__secondary px-[1rem] py-[0.5rem] pt-[1rem] mt-[1rem] ml-[1rem]">Load</button>
              </div>
            </div>
          ) : (
            <h2 className="text-[3rem] text-center">Upload a Contract to get started.</h2>
          )}
        </div>
      </div>
      {deployedContractClassHash && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[2.4rem]">Deployed Contract :</h2>
          <div className="flex flex-row gap-2">
            <div className="flex flex-row gap-2">
              <p className="text-[1.6rem]">Class Hash: {shortDeployedContractClassHash}</p>
              <Image src={copy} alt="Copy" className="w-[1.6rem] h-[1.6rem] cursor-pointer"
                onClick={() => navigator.clipboard.writeText(deployedContractClassHash)} />
            </div>
            <div className="flex flex-row gap-2">
              <p className="text-[1.6rem]">Contract Address: {shortDeployedContractAddress}</p>
              <Image src={copy} alt="Copy" className="w-[1.6rem] h-[1.6rem] cursor-pointer"
                onClick={() => navigator.clipboard.writeText(deployedContractAddress || "")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
