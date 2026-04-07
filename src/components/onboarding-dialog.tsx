import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { SupportedLanguage } from "#/lib/consts";
import { supportedLanguages } from "#/lib/consts";
import { client } from "#/orpc/client";

export const OnboardingDialog = ({
  onComplete,
}: {
  onComplete: () => void;
}) => {
  const [nativeLanguage, setNativeLanguage] =
    useState<SupportedLanguage>("english");
  const [targetLanguage, setTargetLanguage] =
    useState<SupportedLanguage>("spanish");

  const createUser = useMutation({
    mutationFn: () =>
      client.user.createUser({
        nativeLanguage,
        targetLanguage,
      }),
    onSuccess: onComplete,
  });

  return (
    <div>
      <h2>Welcome to Realtalk</h2>
      <p>Set up your languages to get started.</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <label>
          I speak
          <select
            value={nativeLanguage}
            onChange={(e) =>
              setNativeLanguage(e.target.value as SupportedLanguage)
            }
          >
            {supportedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>

        <label>
          I&apos;m learning
          <select
            value={targetLanguage}
            onChange={(e) =>
              setTargetLanguage(e.target.value as SupportedLanguage)
            }
          >
            {supportedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={nativeLanguage === targetLanguage || createUser.isPending}
          onClick={() => createUser.mutate()}
        >
          {createUser.isPending ? "Setting up…" : "Get started"}
        </button>

        {nativeLanguage === targetLanguage && (
          <p>Native and target languages must be different.</p>
        )}
      </div>
    </div>
  );
};
