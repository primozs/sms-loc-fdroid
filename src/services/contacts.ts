import { Core } from '@/plugins/core';
import { ContactPayload } from '@capacitor-community/contacts';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { logDebug, logError } from './useLogger';

export type ContactData = {
  id: number;
  contactId: string;
  name: string;
  address: string;
  image: string | null;
};

export class ContactStore {
  private db: SQLiteDBConnection | undefined;
  private static mInstance: ContactStore;

  constructor(db: SQLiteDBConnection | undefined) {
    this.db = db;
  }

  public static getInstance(db?: SQLiteDBConnection | undefined) {
    if (this.mInstance) {
      return this.mInstance;
    } else {
      this.mInstance = new ContactStore(db);
      return this.mInstance;
    }
  }

  getContacts = async (): Promise<ContactData[]> => {
    try {
      if (!this.db) return [];
      const contacts = (
        await this.db.query('SELECT * from contacts ORDER BY name;')
      ).values as ContactData[];
      return contacts;
    } catch (error: any) {
      logError(error);
      return [];
    }
  };

  getContactById = async (id: number): Promise<ContactData | null> => {
    try {
      if (!this.db) {
        logDebug('contacts getContactById', 'no db');
        return null;
      }
      const contacts = (
        await this.db.query(`SELECT * from contacts WHERE id = ${id};`)
      ).values as ContactData[];
      return contacts[0] ?? null;
    } catch (error: any) {
      logError(error);
      return null;
    }
  };

  getContactByContactId = async (contactId: string) => {
    if (!this.db) {
      logDebug('contacts getContactByContactId', 'no db');
      return;
    }
    const constacts = (
      await this.db.query(`SELECT * FROM contacts WHERE contactId=${contactId}`)
    ).values as ContactData[];
    return constacts.find((item) => item.contactId === contactId);
  };

  addContact = async (c: ContactPayload) => {
    const contactId = c.contactId;
    const name = c.name?.display;
    const address = c.phones
      ?.filter((item) => item.type === 'mobile')
      .find((item) => !!item.number)?.number;
    const image = c.image?.base64String ?? null;
    if (!name || !address) throw new Error('CONTACT_NOT_VALID');

    const formated = await Core.convertToE164PhoneNumFormat({ address });
    const existContact = await this.getContactByContactId(c.contactId);

    if (existContact) {
      this.db?.run(
        `UPDATE contacts 
          SET name = ${name},
              address = ${formated.address}, 
              image = ${image} 
          WHERE 
            contactId = ${contactId};`,
      );
    } else {
      this.db?.run(
        'INSERT INTO contacts (contactId, name, address, image) VALUES (?,?,?,?);',
        [contactId, name, formated.address, image],
      );
    }
  };

  removeContactByContactId = async (contactId: string) => {
    await this.db?.run(`DELETE FROM contacts WHERE contactId=${contactId}`);
  };
}
