import { Operator } from './operator.entity';

describe('Operator Entity', () => {
  it('should create an operator instance', () => {
    const operator = new Operator();
    operator.name = 'Test Operator';
    operator.email = 'test@platform.com';
    operator.passwordHash = 'hashed';
    operator.isActive = true;

    expect(operator.name).toBe('Test Operator');
    expect(operator.email).toBe('test@platform.com');
    expect(operator.isActive).toBe(true);
    expect(operator.createdAt).toBeInstanceOf(Date);
    expect(operator.updatedAt).toBeInstanceOf(Date);
  });
});
