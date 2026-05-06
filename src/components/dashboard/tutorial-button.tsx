import { CirclePlay } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";

export function TutorialButton({ href }: { href: string }) {
  if (!href) {
    return (
      <span className="inline-flex" title="Tutorial video coming soon.">
        <Button disabled size="sm" type="button" variant="secondary">
          <CirclePlay className="size-4" />
          Tutorial
        </Button>
      </span>
    );
  }

  return (
    <LinkButton
      href={href}
      rel="noreferrer"
      size="sm"
      target="_blank"
      variant="secondary"
    >
      <CirclePlay className="size-4" />
      Tutorial
    </LinkButton>
  );
}
