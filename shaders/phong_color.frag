#version 300 es

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;

uniform vec3 light_ambient;
uniform vec3 light_position;
uniform vec3 light_color;
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n

out vec4 FragColor;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    vec3 N = normalize(frag_normal);                        // normalized surface normal
    vec3 L = normalize(light_position - frag_pos);          // normalized light direction

    vec3 R = normalize(2.0 * dotPositive(N, L) * N - L);    // normalized reflected light direction
    vec3 V = normalize(camera_position - frag_pos);         // normalized view direction

    vec3 ambient = light_ambient * material_color;
    vec3 diffuse = light_color *  material_color * dotPositive(N, L);
    vec3 specular = light_color * material_specular * pow(dotPositive(R,V), material_shininess);

    vec3 result = ambient + diffuse + specular;

    FragColor = vec4(result, 1.0);
}
