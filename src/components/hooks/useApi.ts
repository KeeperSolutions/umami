import { useMutation, useQuery } from '@tanstack/react-query';
import { getClientAuthToken } from '@/lib/client';
import { SHARE_TOKEN_HEADER } from '@/lib/constants';
import { type FetchResponse, httpDelete, httpGet, httpPost, httpPut } from '@/lib/fetch';
import { useApp } from '@/store/app';

const selector = (state: { shareToken: { token?: string } }) => state.shareToken;

async function handleResponse(res: FetchResponse): Promise<any> {
  if (!res.ok) {
    const { message, code, status } = res?.data?.error || {};

    return Promise.reject(Object.assign(new Error(message), { code, status }));
  }
  return Promise.resolve(res.data);
}

export function useApi() {
  const shareToken = useApp(selector);

  const basePath = process.env.basePath;

  const getUrl = (url: string) => {
    return url.startsWith('http') ? url : `${basePath || ''}/api${url}`;
  };

  const getHeaders = (headers: any = {}) => {
    // Get token dynamically on each request instead of capturing it once
    const defaultHeaders = {
      authorization: `Bearer ${getClientAuthToken()}`,
      [SHARE_TOKEN_HEADER]: shareToken?.token,
    };
    return { ...defaultHeaders, ...headers };
  };

  return {
    get: async (url: string, params: object = {}, headers: object = {}) => {
      return httpGet(getUrl(url), params, getHeaders(headers)).then(handleResponse);
    },

    post: async (url: string, params: object = {}, headers: object = {}) => {
      return httpPost(getUrl(url), params, getHeaders(headers)).then(handleResponse);
    },

    put: async (url: string, params: object = {}, headers: object = {}) => {
      return httpPut(getUrl(url), params, getHeaders(headers)).then(handleResponse);
    },

    del: async (url: string, params: object = {}, headers: object = {}) => {
      return httpDelete(getUrl(url), params, getHeaders(headers)).then(handleResponse);
    },
    useQuery,
    useMutation,
  };
}
