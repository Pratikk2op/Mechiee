// notificationSound.ts

class NotificationSound {
  private audio: HTMLAudioElement | null = null;

  constructor() {
    // Create audio element for notification sound
    this.audio = new Audio();
    this.audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    this.audio.volume = 0.3;
  }

  play() {
    if (this.audio) {
      this.audio.play().catch(err => {
        console.log('Notification sound failed to play:', err);
      });
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}

export const notificationSound = new NotificationSound(); 