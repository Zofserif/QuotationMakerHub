export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
