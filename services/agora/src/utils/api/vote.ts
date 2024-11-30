import {
  type ApiV1VotingCastVotePostRequest,
  type ApiV1VotingFetchUserVotesForPostSlugIdsPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useDialog } from "../ui/dialog";
import { useCommonApi } from "./common";
import { type VotingAction } from "src/shared/types/zod";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showMessage } = useDialog();

  async function castVoteForComment(
    commentSlugId: string,
    votingAction: VotingAction
  ) {
    try {
      const params: ApiV1VotingCastVotePostRequest = {
        commentSlugId: commentSlugId,
        chosenOption: votingAction,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VotingCastVotePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VotingCastVotePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return true;
    } catch (e) {
      console.error(e);
      showMessage(
        "An error had occured",
        "Failed to fetch user's personal votes."
      );
      return false;
    }
  }

  async function fetchUserVotesForPostSlugIds(postSlugIdList: string[]) {
    try {
      const params: ApiV1VotingFetchUserVotesForPostSlugIdsPostRequest = {
        postSlugIdList: postSlugIdList,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VotingFetchUserVotesForPostSlugIdsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VotingFetchUserVotesForPostSlugIdsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showMessage(
        "An error had occured",
        "Failed to fetch user's personal votes."
      );
      return undefined;
    }
  }

  return { fetchUserVotesForPostSlugIds, castVoteForComment };
}
