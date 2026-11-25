import React from 'react';
import { CourseWorkspace } from '../components/CourseWorkspace';
import { TrainingsPage } from './TrainingsPage';
import { useLms } from '../context/LmsContext';

export function LearningSpacePage() {
  const { effectiveRole } = useLms();
  const isAdmin = effectiveRole === 'super_admin' || effectiveRole === 'admin_kegiatan';

  if (isAdmin) {
    return <TrainingsPage />;
  }

  return <CourseWorkspace />;
}
