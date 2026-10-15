import PublicLayout from '@/Layouts/PublicLayout';
import { Hero, type HeroData } from '@/Components/home/Hero';
import { FeaturedStrip, type FeaturedItem } from '@/Components/home/FeaturedStrip';
import { WritingList, type WritingItem } from '@/Components/home/WritingList';
import { Explore } from '@/Components/home/Explore';

export default function Home({
    hero,
    featured,
    writings,
    explore,
}: {
    hero: HeroData;
    featured: FeaturedItem[];
    writings: WritingItem[];
    explore: { projects: number; collected: number };
}) {
    return (
        <PublicLayout>
            <Hero hero={hero} />
            <FeaturedStrip items={featured} />
            <WritingList writings={writings} />
            <Explore projects={explore.projects} collected={explore.collected} />
        </PublicLayout>
    );
}
