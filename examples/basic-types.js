const { Context, Subject, Brand } = require('../');
const { property } = require('jsverify');

const clamp = (n, min, max) => n < min ?  min
                             : n > max ?  max
                             : /* _ */    n;

// Numeric types
const Int8 = new Brand('Int8');
const Int16 = new Brand('Int16');
const Int32 = new Brand('Int32');
const UInt8 = new Brand('UInt8');
const UInt16 = new Brand('UInt16');
const UInt32 = new Brand('UInt32');
const Float64 = new Brand('Float64');
const Integer = Int8.or(Int16).or(Int32).or(UInt8).or(UInt16).or(UInt32).rename('Integer');
const Decimal = Float64;
const Number = Integer.or(Decimal).rename('Number');

const int8    = (value) => new Subject([Int8],    { value: clamp(value, -128, 127) });
const int16   = (value) => new Subject([Int16],   { value: clamp(value, -32768, 32767) });
const int32   = (value) => new Subject([Int32],   { value: value|0 });
const uint8   = (value) => new Subject([UInt8],   { value: clamp(value, 0, 2**8 - 1) });
const uint16  = (value) => new Subject([UInt16],  { value: clamp(value, 0, 2**16 - 1) });
const uint32  = (value) => new Subject([UInt32],  { value: value >>> 0 });
const float64 = (value) => new Subject([Float64], { value });


// Performs arithmetic without automatic type expansion
const Arithmetic = new Context();
Arithmetic.define('add')
  .add([Int8, Int8],       (a, b) => int8(a.value + b.value))
  .add([Int16, Int16],     (a, b) => int16(a.value + b.value))
  .add([Int32, Int32],     (a, b) => int32(a.value + b.value))
  .add([UInt8, UInt8],     (a, b) => uint8(a.value + b.value))
  .add([UInt16, UInt16],   (a, b) => uint16(a.value + b.value))
  .add([UInt32, UInt32],   (a, b) => uint32(a.value + b.value))
  .add([Float64, Float64], (a, b) => float64(a.value + b.value));

Arithmetic.define('subtract')
  .add([Int8, Int8],       (a, b) => int8(a.value - b.value))
  .add([Int16, Int16],     (a, b) => int16(a.value - b.value))
  .add([Int32, Int32],     (a, b) => int32(a.value - b.value))
  .add([UInt8, UInt8],     (a, b) => uint8(a.value - b.value))
  .add([UInt16, UInt16],   (a, b) => uint16(a.value - b.value))
  .add([UInt32, UInt32],   (a, b) => uint32(a.value - b.value))
  .add([Float64, Float64], (a, b) => float64(a.value - b.value));

Arithmetic.define('multiply')
  .add([Int8, Int8],       (a, b) => int8(a.value * b.value))
  .add([Int16, Int16],     (a, b) => int16(a.value * b.value))
  .add([Int32, Int32],     (a, b) => int32(a.value * b.value))
  .add([UInt8, UInt8],     (a, b) => uint8(a.value * b.value))
  .add([UInt16, UInt16],   (a, b) => uint16(a.value * b.value))
  .add([UInt32, UInt32],   (a, b) => uint32(a.value * b.value))
  .add([Float64, Float64], (a, b) => float64(a.value * b.value));


const throwIfZero = (x) => {
  if (x === 0)  throw new Error('Cannot divide by zero');
}
Arithmetic.define('divide')
  .add([Int8, Int8],       (a, b) => { throwIfZero(b.value); return int8(a.value / b.value) })
  .add([Int16, Int16],     (a, b) => { throwIfZero(b.value); return int16(a.value / b.value) })
  .add([Int32, Int32],     (a, b) => { throwIfZero(b.value); return int32(a.value / b.value) })
  .add([UInt8, UInt8],     (a, b) => { throwIfZero(b.value); return uint8(a.value / b.value) })
  .add([UInt16, UInt16],   (a, b) => { throwIfZero(b.value); return uint16(a.value / b.value) })
  .add([UInt32, UInt32],   (a, b) => { throwIfZero(b.value); return uint32(a.value / b.value) })
  .add([Float64, Float64], (a, b) => float64(a.value / b.value));


describe('Precise arithmetic', () => {
  const { add, subtract, multiply, divide } = Arithmetic.methods;

  describe('Types should be maintained in operations', () => {
    property('int8 + int8 → int8', 'integer', 'integer', (a, b) => {
      return add(int8(a), int8(b)).has(Int8);
    });

    property('int16 + int16 → int16', 'integer', 'integer', (a, b) => {
      return add(int16(a), int16(b)).has(Int16);
    });

    property('int32 + int32 → int32', 'integer', 'integer', (a, b) => {
      return add(int32(a), int32(b)).has(Int32);
    });
  });
});

