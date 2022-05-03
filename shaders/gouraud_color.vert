#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform vec3 light_ambient;
uniform vec3 light_position;
uniform vec3 light_color;       // Ip
uniform vec3 camera_position;
uniform float material_shininess; // n
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);

    vec3 new_normal = normalize(mat3(transpose(inverse(model_matrix))) * vertex_normal);
    vec4 new_position = model_matrix * vec4(vertex_position, 1.0);
    vec3 new_position_xyz = new_position.xyz;

    vec3 n = normalize(new_normal);
    vec3 l = normalize(light_position - new_normal);

    vec3 r = (2.0 * dotPositive(n, l) * n) - l;
    vec3 v = normalize(camera_position - new_position_xyz);


    ambient = light_ambient * material_shininess;
    diffuse = light_color * material_shininess * dotPositive(n,l);
    specular = light_color * material_shininess * pow(dotPositive(r,v), material_shininess);
}

