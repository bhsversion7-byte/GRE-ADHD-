import { GreVocabTrainer } from "@/components/gre-vocab-trainer";

export default async function WordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <GreVocabTrainer page="word" wordId={id} />;
}
