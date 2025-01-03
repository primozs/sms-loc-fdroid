import { alertController } from '@ionic/vue';

export class Alert {
  public static confirm(options: {
    title: string;
    message: string;
    subHeader?: string;
    cancelLabel?: string;
    okLabel?: string;
  }): Promise<{ value: boolean }> {
    // eslint-disable-next-line
    return new Promise(async (resolve, _) => {
      const alertButtons = [
        {
          text: options.cancelLabel ?? 'Cancel',
          role: 'cancel',
          handler: () => {
            resolve({ value: false });
          },
        },
        {
          text: options.okLabel ?? 'OK',
          role: 'confirm',
          handler: () => {
            resolve({ value: true });
          },
        },
      ];

      const alert = await alertController.create({
        header: options.title,
        subHeader: options.subHeader,
        message: options.message,
        buttons: alertButtons,
      });

      await alert.present();
    });
  }
}
