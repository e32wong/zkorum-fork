<template>
  <div>
    <q-page>
      <q-infinite-scroll :offset="250" class="column flex-center" @load="onLoad">
        <div class="postListFlex">
          <div v-for="(postData, index) in compactPostDataList" :key="index" class="postPadding">
            <div>
              <RouterLink :to="{ name: 'single-post', params: { postSlugId: postData.metadata.slugId } }">
                <PostDetails :extended-post-data="postData" :compact-mode="true" :show-comment-section="false" />
              </RouterLink>
            </div>

            <div class="seperator">
              <q-separator />
            </div>

          </div>

        </div>
      </q-infinite-scroll>
    </q-page>
  </div>
</template>

<script setup lang="ts">

import PostDetails from "../post/PostDetails.vue";
import { ref } from "vue";
import { DummyPostDataFormat, usePostStore } from "src/stores/post";

const { fetchUnifiedPosts } = usePostStore();

const FETCH_POST_COUNT = 10;
const compactPostDataList = ref<DummyPostDataFormat[]>([]);
let lastSlugId = "";

generateNewPosts();

function generateNewPosts() {
  const postList = fetchUnifiedPosts(lastSlugId, FETCH_POST_COUNT);
  for (let i = 0; i < postList.length; i++) {
    compactPostDataList.value.push(postList[i]);
  }

  if (postList.length > 0) {
    lastSlugId = postList[postList.length - 1].metadata.slugId;
  } else {
    // Reached the end of the post list
  }

}

interface DoneFunction {
  (): void;
}

async function onLoad(index: number, done: DoneFunction) {

  generateNewPosts();
  done();

  /*
  // Fetch more data from backend
  if (false) {
    compactPostDataList.value = await fetchFeedMore({
      showHidden: false,
      lastReactedAt: undefined,
    });
  }
  */
}

/*
// let interval: NodeJS.Timeout | undefined = undefined

onBeforeUnmount(() => {
  clearInterval(interval);
})


// const todos = ref<Todo[]>([
//   {
//     id: 1,
//     content: 'ct1'
//   },
//   {
//     id: 2,
//     content: 'ct2'
//   },
//   {
//     id: 3,
//     content: 'ct3'
//   },
//   {
//     id: 4,
//     content: 'ct4'
//   },
//   {
//     id: 5,
//     content: 'ct5'
//   }
// ]);

// const meta = ref<Meta>({
//   totalCount: 1200
// });


interface FetchFeedProps {
  showHidden: boolean;
  lastReactedAt: Date | undefined;
}



async function fetchFeedMore({
  showHidden,
  lastReactedAt,
}: FetchFeedProps): Promise<ExtendedPostData[]> {
  const response = await DefaultApiFactory(
    undefined,
    undefined,
    api
  ).apiV1FeedFetchMorePost({
    showHidden: showHidden,
    lastReactedAt: lastReactedAt?.toISOString(),
  });
  if (response.data !== undefined) {
    return response.data.map((value) => {
      return {
        metadata: {
          uid: value.metadata.uid,
          slugId: value.metadata.slugId,
          isHidden: value.metadata.isHidden,
          updatedAt: new Date(value.metadata.updatedAt),
          lastReactedAt: new Date(value.metadata.lastReactedAt),
          commentCount: value.metadata.commentCount,
        },
        payload: value.payload,
        author: value.author,
      };
    });
  } else {
    console.warn("No data fetched");
    return [];
  }
}



onMounted(async () => {
  // const passphrase = ref("nothing");
  // const verified = ref<boolean | string>("nothing")

  // await requestAuth.authenticate("test@email.com", false, getPlatform($q.platform));
  // if ($q.platform.is.mobile) {
  //   // try {
  //   // const prefixedKey = "com.zkorum.agora/v1_userid/sign"
  //   // const { publicKey } = await SecureSigning.generateKeyPair({ prefixedKey: prefixedKey })
  //   // const decodedPublicKey = decodeFromBase64(publicKey);
  //   // const accountDid = publicKeyToDid(decodedPublicKey)
  //   // const _u = await ucans.Builder.create()
  //   //   .issuedBy({
  //   //     did: () => accountDid,
  //   //     jwtAlg: "ES256",
  //   //     sign: async (msg: Uint8Array) => {
  //   //       const { signature } = await SecureSigning.sign({ prefixedKey: prefixedKey, data: encodeToBase64(msg) })
  //   //       return decodeFromBase64(signature);
  //   //     }
  //   //   })
  //   //   .toAudience("did:web:localhost%3A8080")
  //   //   .withLifetimeInSeconds(30)
  //   //   .claimCapability({
  //   //     // with: { scheme: "wnfs", hierPart: "//boris.fission.name/public/photos/" },
  //   //     // can: { namespace: "wnfs", segments: ["OVERWRITE"] },
  //   //     with: httpUrlToResourcePointer("http://localhost:8080/api/v1/testing"),
  //   //     can: httpMethodToAbility("POST"),
  //   //   })
  //   //   .build();
  //   // const encodedUcan = ucans.encode(u)
  //
  //   // api.defaults.headers?.Authorization = `Bearer ${encodedUcan}`;
  //   // verify ucan
  //   // await DefaultApiFactory(
  //   //   undefined,
  //   //   undefined,
  //   //   api
  //   // ).apiV1TestingPost({
  //   //   headers: {
  //   //     "Authorization": `Bearer ${encodedUcan}`
  //   //   }
  //   // });
  //   // } catch (e: unknown) {
  //   //   console.error("Error while verifying UCAN", (e as Error)?.message)
  //   //   verified.value = (e as Error)?.message;
  //   // }
  //
  //
  //   // interval = setInterval(async () => {
  //   //   try {
  //   //     const passphraseDataType = await SecureStorage.get("userid/passphrase", true, true);
  //   //     if (passphraseDataType === null) {
  //   //       passphrase.value = "";
  //   //     }
  //   //
  //   //     if (passphraseDataType instanceof Date) {
  //   //       passphrase.value = passphraseDataType.toISOString();
  //   //     } else {
  //   //       passphrase.value = JSON.stringify(passphraseDataType);
  //   //     }
  //   //     console.log(`Extracted passphrase: ${passphrase.value}`);
  //   //     const newPassphrase = generateRandomPassphrase()
  //   //     await SecureStorage.set(
  //   //       "userid/passphrase",
  //   //       newPassphrase,
  //   //       true,
  //   //       true,
  //   //       KeychainAccess.whenUnlocked
  //   //     )
  //   //   } catch (e) {
  //   //     console.error("An error occured", e)
  //   //   }
  //   // }, 1000)
  // }
});
*/

</script>

<style scoped>
.postListFlex {
  display: flex;
  flex-direction: column;
}

a {
  text-decoration: none;
  color: unset
}

.seperator {
  margin-top: 1rem;
}

.postPadding {
  padding-bottom: 1rem;
}
</style>
