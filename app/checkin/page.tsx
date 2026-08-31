import { Suspense } from 'react';
import { CheckinTool } from './CheckinTool';

export default function CheckinPage() {
  return (
    <Suspense fallback={null}>
      <CheckinTool />
    </Suspense>
  );
}
