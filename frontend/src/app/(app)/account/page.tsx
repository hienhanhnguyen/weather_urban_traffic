"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { ChangePasswordForm } from "@/features/account/ChangePasswordForm";
import { PreferencesForm } from "@/features/account/PreferencesForm";
import { ProfileForm } from "@/features/account/ProfileForm";
import { PushPanel } from "@/features/push/PushPanel";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 mb-4 text-sm opacity-70">{description}</p>
      {children}
    </section>
  );
}

export default function AccountPage() {
  const t = useTranslations("account");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </div>

      <Section title={t("profile.title")} description={t("profile.description")}>
        <ProfileForm />
      </Section>

      <Section
        title={t("preferences.title")}
        description={t("preferences.description")}
      >
        <PreferencesForm />
      </Section>

      <Section title={t("push.title")} description={t("push.description")}>
        <PushPanel />
      </Section>

      <Section
        title={t("password.title")}
        description={t("password.description")}
      >
        <div className="flex flex-col items-start gap-3">
          {passwordChanged && (
            <Callout tone="success">{t("password.changed")}</Callout>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              setPasswordChanged(false);
              setPasswordModalOpen(true);
            }}
          >
            {t("password.open")}
          </Button>
        </div>
      </Section>

      <Modal
        open={passwordModalOpen}
        title={t("password.open")}
        onClose={() => setPasswordModalOpen(false)}
      >
        <ChangePasswordForm
          onSuccess={() => {
            setPasswordModalOpen(false);
            setPasswordChanged(true);
          }}
          onCancel={() => setPasswordModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
