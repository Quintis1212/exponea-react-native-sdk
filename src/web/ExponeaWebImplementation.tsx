import {
  isFormResponse,
  type FormResponse,
} from '../features/Form/types';

const axios: any = () => {};


type ExponeaWebConfig = {
  baseUrl: string;
  projectToken: string;
  applicationId: string;
  authorizationToken: string;
};

class Exponea {
  static config: ExponeaWebConfig | null = null;

 
  static async configure(config: ExponeaWebConfig): Promise<void> {
    this.config = config;
  }


  static async fetchForm(
    placeholderId: string,
    signal?: AbortSignal
  ): Promise<FormResponse> {
    if (!this.config) {
      throw new Error('Exponea SDK is not configured');
    }

    const { baseUrl, projectToken, applicationId, authorizationToken } =
      this.config;

    const res = await axios.get(
      `${baseUrl}/v2/projects/${projectToken}/forms/${placeholderId}`,
      {
        params: { applicationId },
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
          "X-Exponea-SDK-Version": 'web-1.0.0',
          "X-Request-Id": crypto.randomUUID(),
        },
        signal,
      }
    );

    const body: unknown = res.data;
    isFormResponse(body);

 
    return body;
  }
}

 

export { Exponea };
