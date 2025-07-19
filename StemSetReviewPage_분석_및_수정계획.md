      if (mainPlayer && readyStates['main']) {
        try {
          const progress = time / mainPlayer.getDuration();
          if (progress >= 0 && progress <= 1) {
            // main 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            if (trackId === 'main') {
              if (extraPlayer && readyStates['extra']) {
                extraPlayer.seekTo(progress);
              }
              if (selectedStemPlayer && readyStates['selected-stem']) {
                selectedStemPlayer.seekTo(progress);
              }
            }
            // extra 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            else if (trackId === 'extra') {
              if (mainPlayer && readyStates['main']) {
                mainPlayer.seekTo(progress);
              }
              if (selectedStemPlayer && readyStates['selected-stem']) {
                selectedStemPlayer.seekTo(progress);
              }
            }
            // selected-stem 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            else if (trackId === 'selected-stem') {
              if (mainPlayer && readyStates['main']) {
                mainPlayer.seekTo(progress);
              }
              if (extraPlayer && readyStates['extra']) {
                extraPlayer.seekTo(progress);
              }
            }
          }