import { DeclareContractPayload, DeclareAndDeployContractPayload, extractContractHashes } from "starknet";
import { sepolia } from "@starknet-react/chains";
import { provider } from "../components/StarknetProvider";

export const declareDeployContract = async (account: any, contractData: any, compiledContractData: any, calldata: any[]):
  Promise<{ classHash: string, contractAddress: string }> => {
  try {
    if (!account) {
      console.error("Account not connected");
      return { classHash: "", contractAddress: "" };
    }
    // setSubmitted(true);
    // setTxHash("");
    /*
    const declarePayload: DeclareContractPayload = {
      contract: contractData,
      casm: compiledContractData,
    };
    */
    const deployDeclarePayload: DeclareAndDeployContractPayload = {
      contract: contractData,
      casm: compiledContractData,
      constructorCalldata: calldata,
    };
    // TODO: Generic provider (passed as arg)  
    // TODO: No STRK Fees
    // TODO: contractClass differs from declared class
    const innerProvider = provider(sepolia);
    if (!innerProvider) {
      console.error("Provider not found");
      return { classHash: "", contractAddress: "" };
    }
    const declareContractPayload = extractContractHashes(deployDeclarePayload);
    const isDeclared = await innerProvider.isClassDeclared(declareContractPayload);
    if (!isDeclared) {
      console.log("Declaring & Deploying contract...");
      console.log(account);
      const result = await account.declareAndDeploy(deployDeclarePayload);
      console.log("Result:", result);
      const classHash = result.declare.class_hash;
      const contractAddress = result.deploy.contract_address;
      return { classHash, contractAddress };
    } else {
      console.log("Contract already declared:", declareContractPayload.classHash);
      return { classHash: declareContractPayload.classHash, contractAddress: "" };
    }
    // setTxHash(result.transaction_hash);
  } catch (error) {
    console.error(error);
    return { classHash: "", contractAddress: "" };
  } finally {
    console.log("Done.");
    // setSubmitted(false);
  };
}

export const declareContract = async (account: any, contractData: any, compiledContractData: any, setDeployDone: any):
  Promise<{ classHash: string, contract: any, casm: any, compiledClassHash: any }> => {
  try {
    if (!account) {
      console.error("Account not connected");
      return {
        classHash: "",
        contract: undefined,
        casm: undefined,
        compiledClassHash: undefined
      };
    }

    const testDeclarePayload: DeclareContractPayload = {
      contract: contractData,
      casm: compiledContractData,
    };

    const builtDeclarePayload = await account.buildDeclarePayload(testDeclarePayload, {skipValidate: true});
    testDeclarePayload.contract.abi = builtDeclarePayload.contract.abi;

    const extractedData = extractContractHashes(testDeclarePayload);
    const innerProvider = provider(sepolia);
    if (!innerProvider) {
      console.error("Provider not found");
      return {
        classHash: "",
        contract: undefined,
        casm: undefined,
        compiledClassHash: undefined
      };
    }
    const isDeclared = await innerProvider.isClassDeclared(extractedData);

    if (!isDeclared) {
      console.log("Declaring contract...");
      setDeployDone("declaring");
      const result = await account.declare(testDeclarePayload);
      console.log("Result:", result);
      const classHash = result.class_hash;
      return classHash;
    } else {
      console.log("Contract already declared:", extractedData.classHash);
      return {
        classHash: extractedData.classHash,
        contract: extractedData.contract,
        casm: extractedData.casm,
        compiledClassHash: extractedData?.compiledClassHash
      }
    }
  } catch (error) {
    console.error(error);
    return {
      classHash: "",
      contract: undefined,
      casm: undefined,
      compiledClassHash: undefined
    };
  } finally {
    console.log("Done.");
  };
}