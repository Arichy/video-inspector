import React, { useState, useEffect, useCallback } from 'react';
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

  const unlistenRef = React.useRef<() => void>();
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

  // Prevent browser's default file opening behavior
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-100', 'border-blue-400');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-100', 'border-blue-400');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-100', 'border-blue-400');
    console.log('Drop event in React:', e);
    // onDrop is already handled by Tauri events, this is only for visual feedback
  };

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

        {/* Main drop zone */}
        <div
          className="border-2 border-dashed border-blue-300 rounded-lg p-8 mb-10 bg-blue-50
                    flex flex-col items-center justify-center cursor-pointer
                    transition-colors duration-300 hover:bg-blue-100 hover:border-blue-400"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-blue-500 mb-4"
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
          <h2 className="text-xl font-semibold text-blue-700 mb-2">{t('dropzone.title')}</h2>
          <p className="text-blue-600 text-sm max-w-md text-center">{t('dropzone.subtitle')}</p>
          <p className="mt-2 text-blue-500 text-sm">{t('dropzone.clickToSelect')}</p>
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
