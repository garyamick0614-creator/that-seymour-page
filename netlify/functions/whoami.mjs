// /api/whoami → returns the visitor's stable handle.
import { handleFromRequest, jsonResponse, headersAsObject } from './_lib.mjs';

export default async (req) => {
  const headers = headersAsObject(req);
  const { handle } = handleFromRequest({ headers });
  return jsonResponse({ handle, rotates: 'daily at UTC midnight' });
};

export const config = { path: '/api/whoami' };
