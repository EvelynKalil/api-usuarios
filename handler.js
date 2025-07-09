const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const table = 'Usuarios'; 
const sns = new AWS.SNS();
const topicArn = 'arn:aws:sns:us-east-1:221889532284:notificacionesUsuarios'; 
const ssm = new AWS.SSM();

'use strict';

const getParameter = async (name) => {
  const result = await ssm.getParameter({ Name: name, WithDecryption: false }).promise();
  return result.Parameter.Value;
};

module.exports.enviarCorreo = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const topicArn = await getParameter('/config/usuarios/sns_topic_arn');

    const params = {
      Message: body.mensaje,
      Subject: 'Notificación desde Lambda SNS',
      TopicArn: topicArn
    };

    await sns.publish(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ mensaje: 'Correo enviado correctamente' })
    };
  } catch (err) {
    console.error('❌ Error completo:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al enviar correo', details: err.message })
    };
  }
};



module.exports.getUsuarios = async () => {
  const params = {
    TableName: table
  };

  try {
    const data = await dynamo.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(data.Items)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al obtener usuarios', details: err.message })
    };
  }
};


module.exports.createUsuario = async (event) => {
  const nuevo = JSON.parse(event.body);

  const params = {
    TableName: table,
    Item: {
      id: nuevo.id,
      nombre: nuevo.nombre,
      cedula: nuevo.cedula
    }
  };

  try {
    await dynamo.put(params).promise();
    return {
      statusCode: 201,
      body: JSON.stringify({ mensaje: 'Usuario creado', data: params.Item })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al guardar en DynamoDB', details: err.message })
    };
  }
};


module.exports.updateUsuario = async (event) => {
  const id = event.pathParameters.id;
  const datos = JSON.parse(event.body);

  const params = {
    TableName: table,
    Key: { id },
    UpdateExpression: 'set nombre = :n, cedula = :c',
    ExpressionAttributeValues: {
      ':n': datos.nombre,
      ':c': datos.cedula
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await dynamo.update(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ mensaje: `Usuario ${id} actualizado`, data: result.Attributes })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al actualizar usuario', details: err.message })
    };
  }
};


module.exports.deleteUsuario = async (event) => {
  const id = event.pathParameters.id;

  const params = {
    TableName: table,
    Key: { id }
  };

  try {
    await dynamo.delete(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ mensaje: `Usuario ${id} eliminado` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al eliminar usuario', details: err.message })
    };
  }
};

