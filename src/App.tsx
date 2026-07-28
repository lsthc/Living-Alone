import { ChapterDeck } from '@/components/ChapterDeck';
import { DataProvider } from '@/lib/DataProvider';

export default function App() {
  return (
    <DataProvider>
      <ChapterDeck />
    </DataProvider>
  );
}
