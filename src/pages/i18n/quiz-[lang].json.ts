// /i18n/quiz-<lang>.json: questions + every string the quiz shows, per language.
import { liveLangs, quizBundle } from '../../lib/i18n';

export const getStaticPaths = () => liveLangs().map((l) => ({ params: { lang: l.code } }));
export const GET = ({ params }: { params: { lang: string } }) =>
  new Response(JSON.stringify(quizBundle(params.lang)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
