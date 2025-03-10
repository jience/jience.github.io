# Marshmallow自定义字段

## Custom Fields

There are three ways to create a custom-formatted field for a `Schema`:

- Create a custom [`Field`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Field) class
- Use a [`Method`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Method) field
- Use a [`Function`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Function) field

The method you choose will depend on the manner in which you intend to reuse the field.

## Creating A Field Class

To create a custom field class, create a subclass of [`marshmallow.fields.Field`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Field) and implement its [`_serialize`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Field._serialize) and/or [`_deserialize`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Field._deserialize) methods.

```
from marshmallow import fields, ValidationError


class PinCode(fields.Field):
    """Field that serializes to a string of numbers and deserializes
    to a list of numbers.
    """

    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return ""
        return "".join(str(d) for d in value)

    def _deserialize(self, value, attr, data, **kwargs):
        try:
            return [int(c) for c in value]
        except ValueError as error:
            raise ValidationError("Pin codes must contain only digits.") from error


class UserSchema(Schema):
    name = fields.String()
    email = fields.String()
    created_at = fields.DateTime()
    pin_code = PinCode()
```

## Method Fields

A [`Method`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Method) field will serialize to the value returned by a method of the Schema. The method must take an `obj` parameter which is the object to be serialized.

```
class UserSchema(Schema):
    name = fields.String()
    email = fields.String()
    created_at = fields.DateTime()
    since_created = fields.Method("get_days_since_created")

    def get_days_since_created(self, obj):
        return dt.datetime.now().day - obj.created_at.day
```

## Function Fields

A [`Function`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Function) field will serialize the value of a function that is passed directly to it. Like a [`Method`](https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html#marshmallow.fields.Method) field, the function must take a single argument `obj`.

```
class UserSchema(Schema):
    name = fields.String()
    email = fields.String()
    created_at = fields.DateTime()
    uppername = fields.Function(lambda obj: obj.name.upper())
```