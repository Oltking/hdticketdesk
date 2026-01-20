import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors);

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Flatten nested validation errors for better readability
   */
  private flattenValidationErrors(errors: ValidationError[], parentPath = ''): any[] {
    const result: any[] = [];

    for (const error of errors) {
      const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      // Add constraints from this error
      if (error.constraints) {
        result.push({
          property: propertyPath,
          errors: Object.values(error.constraints),
        });
      }

      // Recursively handle children (nested objects)
      if (error.children && error.children.length > 0) {
        result.push(...this.flattenValidationErrors(error.children, propertyPath));
      }
    }

    return result;
  }
}
