import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador de complejidad de contraseñas institucionales.
 * Requiere mínimo 8 caracteres, al menos una letra mayúscula, una minúscula y un dígito.
 */
export const passwordComplexityValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value || '';
  if (!value) return null;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const isValid = value.length >= 8 && hasUpper && hasLower && hasNumber;
  return isValid ? null : { passwordComplexity: true };
};

/**
 * Validador que compara el valor del control actual con otro control del mismo formulario padre.
 */
export function igualAValidator(controlTargetName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) return null;
    const target = control.parent.get(controlTargetName);
    if (!target) return null;
    if (control.value !== target.value) {
      return { noCoincide: true, noIgual: true };
    }
    return null;
  };
}
