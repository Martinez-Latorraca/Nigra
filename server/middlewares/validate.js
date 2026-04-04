const validate = (schema, source = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

    if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ error: messages.join('. ') });
    }

    req[source] = value;
    next();
};

export default validate;
