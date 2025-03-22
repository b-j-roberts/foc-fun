import { REGISTRY_CONTRACT_ADDRESS } from "../../constants";

const printCalldata = (calldata: any) => {
  let str = "";
  for (let i = 0; i < calldata.length; i++) {
    str += calldata[i].toString() + ",";
  }
  console.log(str);
}

export const feltString = (string: string): string => {
  if (!string) {
    return "0x0";
  }
  if (string.length > 31) {
    console.error("String is too long");
    return "";
  }
  // Read utf-8 string into a hex string
  let hex = "";
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    const hexChar = code.toString(16);
    hex += hexChar;
  }
  return "0x" + hex;
}

export const registerClassCall = async (account: any, classHash: string, className: string, classVersion: string):
  Promise<any> => {
  try {
    console.log("Registering class: ", account, classHash, className, classVersion);
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [classHash, feltString(className), feltString(classVersion)];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_class",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const unregisterClassCall = async (account: any, classHash: string):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [classHash];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "unregister_class",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const deployContractCall = async (account: any, contractHash: string, calldata: string[]):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const innerCalldata = [contractHash, calldata.length, ...calldata];
    console.log("Deploying contract: ", account, contractHash, calldata);
    printCalldata(innerCalldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "deploy_contract",
        calldata: innerCalldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash, result);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const registerDeployMultiCall = async (account: any, classHash: string, className: string, classVersion: string, calldata: string[]):
  Promise<any> => {
  let txHash = "";
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const innerCalldata1 = [classHash, feltString(className), feltString(classVersion)];
    const innerCalldata2 = [classHash, calldata.length, ...calldata];
    console.log("Registering deploy multi: ", account, classHash, className, classVersion, calldata);
    printCalldata(innerCalldata1);
    printCalldata(innerCalldata2);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_class",
        calldata: innerCalldata1
      },
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "deploy_contract",
        calldata: innerCalldata2
      }
    ]);
    console.log({
      result
    })
    txHash = result.transaction_hash;
    console.log("Tx hash: ", result.transaction_hash, result);
  } catch (e) {
    console.error("Error: ", e);
    return null;
  } finally {
    console.log("Done");
    return txHash;
  }
}

export const registerContractCall = async (account: any, contractAddress: string, contractHash: string):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [contractAddress, contractHash];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_contract",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const unregisterContractCall = async (account: any, contractHash: string):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [contractHash];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "unregister_contract",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const registerEventCall = async (account: any, contractAddress: string, eventSelector: string):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [contractAddress, eventSelector];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_event",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}

export const registerContractAndEventsCall = async (account: any, contractAddress: string, classHash: string, eventSelectors: string[]):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const executeData = eventSelectors.map((selector) => {
      return {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_event",
        calldata: [contractAddress, selector]
      }
    });
    console.log("Registering events: ", account, executeData);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "register_contract",
        calldata: [contractAddress, classHash]
      },
      ...executeData
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}
export const unregisterEventCall = async (account: any, eventId: string):
  Promise<any> => {
  try {
    if (!account) {
      console.error("Account is not connected");
      return null;
    }

    const calldata = [eventId];
    printCalldata(calldata);
    const result = await account.execute([
      {
        contractAddress: REGISTRY_CONTRACT_ADDRESS,
        entrypoint: "unregister_event",
        calldata: calldata
      }
    ]);
    console.log("Tx hash: ", result.transaction_hash);
  } catch (e) {
    console.error("Error: ", e);
  } finally {
    console.log("Done");
  }
}
