import "axios";

declare module "axios" {
  interface AxiosRequestConfig<D = any> {
    skipAuthRedirect?: boolean;
  }
}

export {};
