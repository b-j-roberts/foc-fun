import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAccount, useProvider } from "@starknet-react/core";

import { ContractInput } from "./ContractInput";
import { declareContract } from "../../contract/calls";
import { feltString, registerClassCall, registerDeployMultiCall, registerContractAndEventsCall } from "../../contract/registry";

import upload from "../../../public/icons/upload.png";
import uploaded from "../../../public/icons/uploaded.png";
import { extractConContract, tractHashes, hash, Contract, extractContractHashes, json } from "starknet";
import { REGISTRY_CONTRACT_ADDRESS } from "../../../constants";
// import edit from "../../../public/icons/edit.png";

// TODO: no compiled_contract_class.json?
// TODO: All spots null is returned, send err
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
export default function EngineDeploy(_props: any) {
  const { account }: any = useAccount();
  const contractClassRef = useRef<HTMLInputElement>(null);
  const compiledContractRef = useRef<HTMLInputElement>(null);
  const [contractClassFile, setContractClassFile] = useState<File | null>(null);
  const [compiledContractFile, setCompiledContractFile] = useState<File | null>(null);

  const [contractClassData, setContractClassData] = useState<any | null>(null);
  const [compiledContractData, setCompiledContractData] = useState<any | null>(null);
  const [contractAbi, setContractAbi] = useState<any[]>([]);
  const [constructorInputs, setConstructorInputs] = useState<any[]>([]);
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

  const compileDeployCallData = (): any[] => {
    // TODO: Compile the call data from input fields
    return [42];
  }

  const isClassRegistered = async (provider: any, classHash: string) => {
    const { abi } = await provider.getClassAt(REGISTRY_CONTRACT_ADDRESS);
    if (abi === undefined) {
      console.log("No registry contract abi found.")
    }
    const contract = new Contract(json.parse(abi), REGISTRY_CONTRACT_ADDRESS, provider);
    const get_class = await contract.get_class(classHash);
    console.log({
      get_class
    })
    return !((feltString(get_class?.name) === "0x0") && (feltString(get_class?.version) === "0x0"))
  }

  const isContractDeployed = async (provider: any, contractAddress: string) => {
    try {
      const result = await provider.getClassAt(contractAddress);
      return result !== undefined;
    } catch (error) {
      return false;
    }
  }

  const [deployDone, setDeployDone] = useState<"registering" | "declaring" | "deploying" | "deployed" | undefined>(undefined);
  const [deployedContractClassHash, setDeployedContractClassHash] = useState<string | null>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [contractClassName, setContractClassName] = useState<string>("");
  const [contractClassVersion, _setContractClassVersion] = useState<string>("v0.0.0");
  const { provider } = useProvider();
  const deploy = async () => {
    console.log("Declaring & Deploying contract...");
    const testDeclarePayload = {
      contract: contractClassData,
      casm: compiledContractData,
    };
    const builtDeclarePayload = await account?.buildDeclarePayload(testDeclarePayload, { skipValidate: true });
    testDeclarePayload.contract.abi = builtDeclarePayload.contract.abi;
    const { classHash } = await declareContract(account, contractClassData, compiledContractData, setDeployDone);
    const classRegistered = await isClassRegistered(provider, classHash);
    console.log({
      classRegistered,
      classHash
    })
    if (!classRegistered) {
      setDeployDone("registering");
      await registerClassCall(account, classHash, contractClassName, contractClassVersion);
    }
    const calldata = compileDeployCallData()
    const contractAddress = hash.calculateContractAddressFromHash("0", classHash, calldata, REGISTRY_CONTRACT_ADDRESS);
    const deployed = await isContractDeployed(provider, contractAddress)
    if (!deployed) {
      setDeployDone("deploying");
      await registerDeployMultiCall(account, classHash, contractClassName, contractClassVersion, calldata);
    }
    setDeployedContractAddress(contractAddress);
    setDeployedContractClassHash(classHash);
    setDeployDone("deployed");
  }
  // TODO: Register events before deploying the contract
  const registerEvents = async () => {
    if (!deployedContractAddress) return;

    // Get all events to register
    const eventsData = contractAbi.find((item: any) => item.type === "event" &&
      item.name.endsWith("::Event"));
    if (!eventsData) return;
    const eventsToRegister = eventsData.variants.map((event: any) => {
      return hash.getSelectorFromName(event.name);
    });
    console.log("Events to register: ", deployedContractAddress, eventsToRegister);

    // Register each event
    await registerContractAndEventsCall(account, deployedContractAddress, deployedContractClassHash || "", eventsToRegister);
  }
  useEffect(() => {
    registerEvents();
  }, [deployedContractAddress]);

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
                    <ContractInput key={idx} input={input} abi={contractAbi} />
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
      {
        deployDone === "registering" && <div className="flex flex-row items-center gap-2">
          <p className="text-[2rem]">Status: Registering Class...</p>
        </div>
      }
      {
        deployDone === "declaring" && <div className="flex flex-row items-center gap-2">
          <p className="text-[2rem]">Status: Declaring...</p>
        </div>
      }
      {
        deployDone === "deploying" && <div className="flex flex-row items-center gap-2">
          <p className="text-[2rem]">Status: Deploying...</p>
        </div>
      }
      {deployDone === "deployed" && (
        <div className="flex flex-row items-center gap-2">
          <p className="text-[2rem]">Class Hash: {deployedContractClassHash}</p>
          <p className="text-[2rem]">Contract Address: {deployedContractAddress}</p>
        </div>
      )}
    </div>
  );
}
