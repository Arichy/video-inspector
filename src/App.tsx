import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { VideoMetadata } from './types';
import Video from './components/Video/Video';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';
import { toast, ToastContainer } from 'react-toastify';

function App() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, VideoMetadata>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const addFile = useCallback((file: string) => {
    setFiles(prevFiles => [...prevFiles, file]);
  }, []);

  const removeFile = useCallback((file: string) => {
    console.log('Removing file:', file);
    setFiles(prevFiles => prevFiles.filter(f => f !== file));
    setMetadataMap(prevMap => {
      const newMap = { ...prevMap };
      delete newMap[file];
      return newMap;
    });
    setErrorMap(prevMap => {
      const newMap = { ...prevMap };
      delete newMap[file];
      return newMap;
    });
  }, []);

  const processFile = useCallback(
    async (file: string) => {
      try {
        const result = await invoke<VideoMetadata>('get_video_metadata', { path: file });

        console.log('Video metadata result:', result);
        setMetadataMap(prevMap => ({
          ...prevMap,
          [file]: result,
        }));
      } catch (error) {
        console.error('Error getting video metadata:', error);
        // Show error toast
        toast.error(t('errors.videoProcessingFailed'), {
          autoClose: 2000,
        });
        setErrorMap(prevMap => ({
          ...prevMap,
          [file]: (error as string) || t('errors.unknownError'),
        }));
      }
    },
    [t]
  );

  const handleFileDrop = useCallback(
    async (file: string) => {
      // check if is processing
      console.log(files);
      if (files.includes(file)) {
        if (metadataMap[file]) {
          toast.warn(t('errors.fileAlreadyProcessed'), {
            autoClose: 2000,
          });
          console.log(t('errors.fileAlreadyProcessed'), file);
          return;
        }
        // If file is already in the processing list, return directly

        toast.warn(t('errors.fileBeingProcessed'), {
          autoClose: 2000,
        });
        console.warn(t('errors.fileBeingProcessed'), file);
        return;
      }

      console.log('File dropped:', file);
      addFile(file);

      await processFile(file);
    },
    [addFile, files, metadataMap, processFile, t]
  );

  const unlistenRef = useRef<(() => void) | null>(null);
  // Listen for drag and drop events inside the webview
  useEffect(() => {
    (() => {
      getCurrentWebview()
        .onDragDropEvent(event => {
          if (event.payload.type !== 'drop') {
            return;
          }
          console.log('Webview drag drop event:', event);
          if (event.payload.paths && event.payload.paths.length > 0) {
            handleFileDrop(event.payload.paths[0]);
          } else {
            console.warn(t('errors.noFilesDropped'));
          }
        })
        .then(unlisten => {
          if (unlistenRef.current) {
            unlistenRef.current();
          }
          unlistenRef.current = unlisten;
        });
    })();
  }, [handleFileDrop, t]);

  // Handle video deletion
  const handleDeleteVideo = (filePath: string) => {
    removeFile(filePath);
  };

  // Handle video processing retry
  const handleRetryVideo = async (filePath: string) => {
    // Clear error state
    setErrorMap(prevMap => {
      const newMap = { ...prevMap };
      delete newMap[filePath];
      return newMap;
    });

    // Clear previous metadata
    setMetadataMap(prevMap => {
      const newMap = { ...prevMap };
      delete newMap[filePath];
      return newMap;
    });

    // Reprocess the file
    await processFile(filePath);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <ToastContainer />
      <LanguageSwitcher />
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('app.title')}</h1>
          <p className="text-gray-600">{t('app.subtitle')}</p>
        </header>

        {/* Upload section */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              open({
                multiple: false,
                filters: [{ name: t('fileDialog.videoFiles'), extensions: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'm4v'] }],
              }).then(selectedFile => {
                if (selectedFile) {
                  handleFileDrop(selectedFile);
                } else {
                  console.warn(t('errors.noFileSelected'));
                }
              });
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {t('upload.selectFile')}
          </button>
          <p className="mt-3 text-gray-600 text-sm">{t('upload.dragDropHint')}</p>
        </div>

        {/* Video card grid */}
        {files.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {t('video.processedVideos')} ({files.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map(file => (
                <div
                  key={file}
                  className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <Video
                    metadata={metadataMap[file]}
                    error={errorMap[file]}
                    onDelete={() => handleDeleteVideo(file)}
                    onRetry={handleRetryVideo}
                    path={file}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message when no files are present */}
        {files.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p>{t('video.noVideosYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
