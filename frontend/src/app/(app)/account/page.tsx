"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { ChangePasswordForm } from "@/features/account/ChangePasswordForm";
import { PreferencesForm } from "@/features/account/PreferencesForm";
import { ProfileForm } from "@/features/account/ProfileForm";

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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="mt-1 text-sm opacity-70">
          Manage your profile, how alerts reach you, and your password.
        </p>
      </div>

      <Section
        title="Profile"
        description="How you are identified in the application."
      >
        <ProfileForm />
      </Section>

      <Section
        title="Preferences"
        description="Language, timezone, and which alerts are delivered to you."
      >
        <PreferencesForm />
      </Section>

      <Section
        title="Password"
        description="Changing your password revokes every other signed-in session."
      >
        <div className="flex flex-col items-start gap-3">
          {passwordChanged && (
            <Callout tone="success">
              Password changed. Other devices have been signed out.
            </Callout>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              setPasswordChanged(false);
              setPasswordModalOpen(true);
            }}
          >
            Change password
          </Button>
        </div>
      </Section>

      <Modal
        open={passwordModalOpen}
        title="Change password"
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
