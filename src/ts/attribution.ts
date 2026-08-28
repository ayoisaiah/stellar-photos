const UTM_PARAMS =
  "utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit";

function attributionUrl(rawUrl: string, sourceId: string): string {
  if (!rawUrl || sourceId !== "unsplash") return rawUrl;

  const separator = rawUrl.includes("?") ? "&" : "?";

  return `${rawUrl}${separator}${UTM_PARAMS}`;
}

export { attributionUrl };
