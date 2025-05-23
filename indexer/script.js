const STARTING_BLOCK = 610000;

export const config = {
  streamUrl: Deno.env.get("APIBARA_STREAM_URL"),
  startingBlock: STARTING_BLOCK,
  network: "starknet",
  finality: "DATA_STATUS_PENDING",
  filter: {
    header: { weak: true },
    events: [
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Class Registered Event
          "0x011fcf2735cfadde3c48253da6e8eacdf6030dc3694cc3d710b22214d6a2ed19"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Class Unregistered Event
          "0x02d1c04b30a8b94c8c50041b1ed30cb6ffc4262fad157e3667bbf079fd98573e"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Contract Registered Event
          "0x0206ba27d5bbda42a63e108ee1ac7a6455c197ee34cd40a268e61b06f78dbc9a"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Contract Unregistered Event
          "0x0069e43076bf9eba962d5d3f8b222b4cdfcfe683bb250721b723e260180c10a9"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Event Registered Event
          "0x00b76210508ae32b1edabae03977822391fd60465414b2ddbdafbebd1f0240f8"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("FOC_FUN_REGISTRY_CONTRACT"),
        keys: [
          // Event Unregistered Event
          "0x011623d02d5b80848a6a356e327cf4904e3b610faaf26f7e1d38c31cfd180632"
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      }
    ]
  },
  sinkType: "webhook",
  sinkOptions: {
    targetUrl: Deno.env.get("CONSUMER_TARGET_URL")
  }
};

export function factory(block) {
  const newFilters = block.events.map(event => {
    if (event.event.keys[0] !== "0x00b76210508ae32b1edabae03977822391fd60465414b2ddbdafbebd1f0240f8") {
      // Filter out events that are not Event Registered
      return null;
    }
    if (event.event.data) {
      return [
        {
          fromAddress: event.event.data[0],
          keys: [
            event.event.data[1]
          ],
          includeReverted: false,
          includeTransaction: false,
          includeReceipt: false
        }
      ];
    }
    return null;
  })
  .filter(filters => filters !== null)
  .flat();

  const allFilters = config.filter.events.concat(newFilters);
  return {
    filter: newFilters.length > 0 ? {
      header: { weak: true },
      events: allFilters,
    } : config.filter,
  };
}

export default function transform(block) {
  return block;
}

