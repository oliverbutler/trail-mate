import { HTTP_ERRORS } from '@trail-mate/api-types';
import { z } from 'zod';

export class HttpError<
  TErrorCode extends keyof typeof HTTP_ERRORS,
  TErrorInfo extends z.infer<(typeof HTTP_ERRORS)[TErrorCode]>
> extends Error {
  public statusCode: number;
  public body: any;

  constructor(statusCode: TErrorCode, payload: TErrorInfo) {
    super(JSON.stringify(payload));
    this.statusCode = statusCode;
    this.body = payload;

    // Restore the prototype chain. This ensures the instanceof keyword will work.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
