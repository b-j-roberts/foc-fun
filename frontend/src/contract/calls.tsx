import { extractContractHashes } from "starknet";

export const declareIfClass = async (account: any, contractData: any, compiledContractData: any):
  Promise<{ classHash: string }> => {
  try {
    if (!account) {
      console.error("Account not connected");
      return { classHash: "" };
    }

    const declarePayload = {
      contract: contractData,
      casm: compiledContractData,
    };
    // TODO: This is a workaround due to issues w/ starknetjs declare abi issues
    const extractedData = extractContractHashes(declarePayload);
    const builtDeclarePayload = await account.buildDeclarePayload(declarePayload, {skipValidate: true});
    const declarePayload2 = {
      contract: { ...contractData, abi: builtDeclarePayload.contract.abi },
      casm: { ...compiledContractData },
    };
    const builtDeclarePayload2 = await account.buildDeclarePayload(declarePayload2, {skipValidate: true});
    const declarePayload3 = {
      contract: { ...contractData, abi: builtDeclarePayload2.contract.abi },
      casm: { ...compiledContractData },
    };
    // TODO: This causes contract to be unusable from block explorer
    const extractedData1 = extractContractHashes(declarePayload);
    const extractedData2 = extractContractHashes(declarePayload2);
    const extractedData3 = extractContractHashes(declarePayload3);
    console.log("Extracted data", { extractedData, extractedData1, extractedData2, extractedData3 });
    const isDeclared = await account.isClassDeclared(extractedData3);
    console.log("Checking if class is declared", extractedData3.classHash, "=>", isDeclared);
    if (isDeclared) {
      console.log("Class already declared", extractedData3.classHash);
      return { classHash: extractedData3.classHash };
    } else {
      console.log("Declaring class", declarePayload2);
      const result = await account.declare(declarePayload2);
      console.log("Class declared", result);
      return { classHash: result.class_hash };
    }
  } catch (error) {
    console.error(error);
    return { classHash: "" };
  } finally {
    console.log("Done.");
  };
}