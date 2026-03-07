import { Transform } from 'class-transformer';

export function ToInt(): PropertyDecorator {
  return Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  });
}
