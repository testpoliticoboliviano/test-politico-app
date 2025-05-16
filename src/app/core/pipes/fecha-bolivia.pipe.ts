import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'fechaBolivia'
})
export class FechaBoliviaPipe implements PipeTransform {

  transform(value: number | Date | Timestamp): string {
    let fecha: Date;

    if (!value) return '';

    // Detectar tipo
    if (typeof value === 'number') {
      fecha = new Date(value);
    } else if (value instanceof Date) {
      fecha = value;
    } else if ('toDate' in value) {
      // Firebase Timestamp
      fecha = value.toDate();
    } else {
      return '';
    }

    // Convertir a hora local de Bolivia (GMT-4)
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/La_Paz'
    };

    const formateada = new Intl.DateTimeFormat('es-BO', options).format(fecha);

    return `${formateada} (GMT-4)`;
  }

}
