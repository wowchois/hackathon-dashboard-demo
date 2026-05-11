import { useEffect, useState } from 'react';
import { apiGetDownloadUrl } from '../../api/noticeFiles';

interface Props {
  fileId: string;
  fileName: string;
}

export default function NoticeImage({ fileId, fileName }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    apiGetDownloadUrl(fileId).then(setSrc).catch(() => {});
  }, [fileId]);

  if (!src) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      className="w-full max-h-96 object-contain rounded-lg bg-gray-50"
    />
  );
}
