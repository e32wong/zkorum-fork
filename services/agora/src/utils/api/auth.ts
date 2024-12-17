import {
  type ApiV1AuthAuthenticatePost200Response,
  type ApiV1AuthAuthenticatePostRequest,
  type ApiV1AuthVerifyOtpPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { axios, api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";

export interface AuthenticateReturn {
  isSuccessful: boolean;
  data: ApiV1AuthAuthenticatePost200Response | null;
  error: "already_logged_in" | "throttled" | "";
}

interface SendSmsCodeProps {
  phoneNumber: string;
  defaultCallingCode: string;
  isRequestingNewCode: boolean;
}

export function useBackendAuthApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());
  const { loadPostData } = usePostStore();
  const { loadUserProfile } = useUserStore();

  async function sendSmsCode({
    phoneNumber,
    defaultCallingCode,
    isRequestingNewCode,
  }: SendSmsCodeProps): Promise<AuthenticateReturn> {

    const params: ApiV1AuthAuthenticatePostRequest = {
      phoneNumber: phoneNumber,
      defaultCallingCode: defaultCallingCode,
      isRequestingNewCode: isRequestingNewCode,
    };
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthAuthenticatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const otpDetails = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthAuthenticatePost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );
      return { isSuccessful: true, data: otpDetails.data, error: "" };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 409) {
          return {
            isSuccessful: false,
            data: null,
            error: "already_logged_in",
          };
        } else if (e.response?.status === 429) {
          return {
            isSuccessful: false,
            data: null,
            error: "throttled",
          };
        } else {
          console.log("Unknown status code: " + e.response?.status);
          throw e;
        }
      } else {
        console.log("Unknown error");
        throw e;
      }
    }
  }

  async function smsCode(code: number) {
    try {
      const params: ApiV1AuthVerifyOtpPostRequest = {
        code: code,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthVerifyOtpPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthVerifyOtpPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return {
        isSuccessful: response.data.success,
        data: response.data,
        error: response.data.reason,
      };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 409) {
          return {
            isSuccessful: true,
            data: null,
            error: "already_logged_in",
          };
        } else if (e.response?.status === 429) {
          // return "throttled";
          return {
            isSuccessful: false,
            data: null,
            error: "throttled",
          };
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  async function deviceIsLoggedIn() {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AuthCheckLoginStatusPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return { isSuccessful: true, error: "" };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 409) {
          return { isSuccessful: true, error: "already_logged_in" };
        } else if (e.response?.status === 429) {
          return { isSuccessful: false, error: "throttled" };
        } else if (e.response?.status === 401) {
          return { isSuccessful: false, error: "unauthorized" };
        } else {
          throw e;
        }
      } else {
        return { isSuccessful: false, error: "unknown" };
      }
    }
  }

  async function logout() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthLogoutPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const otpDetails = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthLogoutPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return { data: otpDetails.data };
  }

  function loadAuthenticatedModules() {
    loadUserProfile();
  }

  async function initializeAuthState() {
    const status = await deviceIsLoggedIn();
    if (!status.isSuccessful) {
      if (status.error == "already_logged_in") {
        console.log("user is already logged in");
        isAuthenticated.value = true;
        loadAuthenticatedModules();
      } else if (status.error == "throttled") {
        console.log("auth check had been throttled");
      } else {
        // unauthorized
        console.log("User is unauthorized");
        console.log(status.error);
        isAuthenticated.value = false;
      }
    } else {
      console.log("User is authenticated");
      isAuthenticated.value = true;
      loadAuthenticatedModules();
    }

    loadPostData(false);
  }

  return {
    sendSmsCode,
    smsCode,
    logout,
    deviceIsLoggedIn,
    initializeAuthState,
  };
}
