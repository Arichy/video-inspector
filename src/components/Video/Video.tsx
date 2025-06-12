import type { VideoMetadata } from '@/types';

export default function Video({
  path,
  metadata,
  error,
  onDelete,
  onRetry,
}: {
  path: string;
  metadata: VideoMetadata | null;
  error: string | null;
  onDelete?: () => void;
  onRetry?: (filePath: string) => void; // 如果需要重试功能，可以传入文件路径
}) {
  // 固定使用16:9的比例，不再需要动态计算
  const aspectRatio = '16/9';

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto rounded-lg bg-red-50 border border-red-200 shadow-md text-center relative">
        {/* 删除按钮 */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors duration-200 cursor-pointer"
            title="删除视频"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-red-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2>{path}</h2>
        <h2 className="text-xl font-bold text-red-700 mb-2">处理错误</h2>
        <p className="text-red-600 mb-4">{error}</p>

        {onRetry && path && (
          <button
            onClick={() => onRetry(path)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200"
            title="重试处理"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重试
          </button>
        )}
      </div>
    );
  }

  // 加载状态
  if (!metadata) {
    return (
      <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="animate-pulse">
          {/* 缩略图区域占位符 - 固定16:9比例 */}
          <div className="w-full bg-gray-200" style={{ aspectRatio }} />

          {/* 信息区占位符 */}
          <div className="p-4">
            {/* 文件名占位符 */}
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />

            {/* 视频信息占位符 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 显示结果 */}
      {metadata && (
        <div className="results relative">
          {/* 视频卡片 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300">
            {/* 删除按钮 */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors duration-200 cursor-pointer"
                title="删除视频"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {metadata.error ? (
              <div className="p-6 bg-red-50 text-red-700">
                <div className="flex items-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="font-bold text-lg">文件处理失败</h3>
                </div>
                <p className="mb-2 truncate">{metadata.file_path}</p>
                <p className="mb-4 text-sm text-red-600">{metadata.error}</p>

                {onRetry && (
                  <button
                    onClick={() => onRetry(metadata.file_path)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center justify-center transition-colors duration-200 mt-2"
                    title="重试处理"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    重试
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                {/* 缩略图区域 - 固定16:9比例 */}
                <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio }}>
                  <img src={metadata.thumbnail_base64} alt="视频缩略图" className="w-full h-full object-contain" />
                </div>

                {/* 信息区 */}
                <div className="w-full p-4 bg-gradient-to-b from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 truncate" title={metadata.file_path}>
                    {metadata.file_path.split(/[\\/]/).pop()}
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 text-sm">
                    <div className="flex">
                      <span className="font-medium w-16">分辨率:</span>
                      <span className="text-gray-600">{metadata.resolution}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-16">帧率:</span>
                      <span className="text-gray-600">{metadata.frame_rate} fps</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-16">时长:</span>
                      <span className="text-gray-600">{metadata.duration}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-16">码率:</span>
                      <span className="text-gray-600">{metadata.bit_rate}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
