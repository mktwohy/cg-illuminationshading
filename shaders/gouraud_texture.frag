#version 300 es

precision mediump float;

in vec3 ambient;
in vec3 diffuse;
in vec3 specular;
in vec2 frag_texcoord;

uniform vec3 material_color;    // Ka and Kd
uniform vec3 material_specular; // Ks
uniform sampler2D image;        // use in conjunction with Ka and Kd

out vec4 FragColor;

void main() { // might need to change this from color???
    
    vec3 temptexture = texture(image, frag_texcoord).rgb; // got this form opengl documentation, this gets texels from a texture
    vec3 ambient_light = ambient * temptexture;
    vec3 diffuse_light = diffuse * temptexture;
    vec3 specular_light = specular * material_specular; 

    vec3 result = ambient_light + diffuse_light + specular_light;
    //FragColor = vec4(result, 1.0); // which one?
    FragColor = vec4(result, 1.0) *texture(image, frag_texcoord); // which one?

}
