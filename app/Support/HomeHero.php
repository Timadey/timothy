<?php

namespace App\Support;

use App\Models\Setting;

class HomeHero
{
    public const SETTING_KEY = 'home_hero';

    public function __construct(
        public string $headline = "Hey, I’m Timadey.",
        public ?string $role = null,
        public ?string $company = null,
        public ?string $companyUrl = null,
        public ?string $status = null,
        public ?string $avatarPath = null,
        public ?string $logoPath = null,
    ) {}

    public static function load(): self
    {
        $raw = Setting::get(self::SETTING_KEY);
        $data = $raw !== null ? json_decode($raw, true) : null;

        return self::fromArray(is_array($data) ? $data : []);
    }

    public static function fromArray(array $data): self
    {
        $defaults = new self();

        return new self(
            headline: self::nonEmpty($data['headline'] ?? null) ?? $defaults->headline,
            role: self::nonEmpty($data['role'] ?? null),
            company: self::nonEmpty($data['company'] ?? null),
            companyUrl: self::nonEmpty($data['company_url'] ?? null),
            status: self::nonEmpty($data['status'] ?? null),
            avatarPath: self::nonEmpty($data['avatar_path'] ?? null),
            logoPath: self::nonEmpty($data['logo_path'] ?? null),
        );
    }

    public static function save(array $data): self
    {
        $hero = self::fromArray($data);
        Setting::set(self::SETTING_KEY, json_encode($hero->toArray(), JSON_UNESCAPED_SLASHES));

        return $hero;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'headline' => $this->headline,
            'role' => $this->role,
            'company' => $this->company,
            'company_url' => $this->companyUrl,
            'status' => $this->status,
            'avatar_path' => $this->avatarPath,
            'logo_path' => $this->logoPath,
        ];
    }

    public function avatarUrl(): ?string
    {
        return $this->avatarPath !== null ? '/storage/'.$this->avatarPath : null;
    }

    public function logoUrl(): ?string
    {
        return $this->logoPath !== null ? '/storage/'.$this->logoPath : null;
    }

    public function initials(): string
    {
        $words = preg_split('/\s+/', trim(Setting::get('site_title', 'Timadey'))) ?: [];
        $letters = '';

        foreach ($words as $word) {
            if ($word !== '') {
                $letters .= mb_strtoupper(mb_substr($word, 0, 1));
            }
            if (mb_strlen($letters) >= 2) {
                break;
            }
        }

        return $letters !== '' ? $letters : 'T';
    }

    private static function nonEmpty(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
