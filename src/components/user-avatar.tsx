import Image from "next/image";

type UserAvatarProps = {
  name: string | null;
  email: string | null;
  image: string | null;
  size?: number;
};

/** "Soumya Ganesh" → "SG", no name → first letter of email, nothing → "?" */
function getInitials(name: string | null, email: string | null): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export function UserAvatar({ name, email, image, size = 64 }: UserAvatarProps) {
  const label = name ?? email ?? "User";

  if (image) {
    return (
      <Image
        src={image}
        alt={`${label}'s profile photo`}
        width={size}
        height={size}
        className="rounded-full"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${label}'s avatar`}
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-700"
    >
      {getInitials(name, email)}
    </div>
  );
}