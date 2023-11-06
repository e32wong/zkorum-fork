import { countries as allCountries, type TCountryCode } from "countries-list";
import {
    BBSPlusCredentialBuilder as CredentialBuilder,
    CredentialSchema,
    SUBJECT_STR,
    BBSPlusSecretKey as SecretKey,
    BBSPlusCredential as Credential,
    BBSPlusBlindedCredentialRequest as BlindedCredentialRequest,
    BBSPlusBlindedCredential as BlindedCredential,
} from "@docknetwork/crypto-wasm-ts";
import type {
    EmailCredentialRequest,
    EmailCredentialsPerEmail,
    EmailCredential,
    SecretCredential,
    SecretCredentialType,
    SecretCredentialsPerType,
    Countries,
} from "../shared/types/zod.js";
import { log } from "../app.js";
import {
    EssecCampus,
    EssecProgram,
    UniversityType,
    essecCampusStrToEnum,
    essecCampusToString,
    essecProgramStrToEnum,
    essecProgramToString,
    minStudentYear,
    universityStringToType,
    universityTypeToString,
} from "../shared/types/university.js";
import { domainFromEmail } from "@/shared/shared.js";

enum WebDomainType {
    UNIVERSITY,
    // COMPANY
    // ADMINISTRATION / PUBLIC_SECTOR
    // ...
}

function getTypeFromEmail(_email: string): WebDomainType {
    // TODO: have list of known domain names for each type in a static file or in the DB
    // load it on startup, pass it here and compare with fqdn
    // const fqdn = email.trim().toLowerCase().split("@")[1]
    // 1st version only support university
    return WebDomainType.UNIVERSITY;
}

export function buildSecretCredential(
    blindCredentialRequest: BlindedCredentialRequest,
    userId: string,
    type: SecretCredentialType,
    email: string,
    sk: SecretKey
): BlindedCredential {
    // create blinded credential from blind credential request
    const result = blindCredentialRequest.verify([]);
    if (!result.verified) {
        throw new Error(result.error);
    }
    const blindedCredBuilder =
        blindCredentialRequest.generateBlindedCredentialBuilder();
    blindedCredBuilder.subject = {
        email: email,
        userId: userId,
        type: type,
    };
    // TODO accumulator and revocation status
    const blindedCred = blindedCredBuilder.sign(sk);
    return blindedCred;
}

function toCredProperties(emailCredentialRequest: EmailCredentialRequest) {
    switch (emailCredentialRequest.type) {
        case UniversityType.STUDENT:
            // replace undefined by false in list of countries
            for (const countryCode of Object.keys(allCountries)) {
                if (
                    emailCredentialRequest.countries[
                        countryCode as TCountryCode
                    ] === undefined
                ) {
                    emailCredentialRequest.countries[
                        countryCode as TCountryCode
                    ] = false;
                }
            }
            return {
                type: universityTypeToString(emailCredentialRequest.type),
                campus: essecCampusToString(emailCredentialRequest.campus),
                program: essecProgramToString(emailCredentialRequest.program),
                countries: emailCredentialRequest.countries,
                admissionYear: emailCredentialRequest.admissionYear,
            };
        case UniversityType.ALUM:
            // TODO
            return {};
        case UniversityType.FACULTY:
            // TODO
            return {};
    }
}

interface TypeSchema {
    type: string;
}

let allCountriesAsSchema: { [countryCode: string]: TypeSchema } | undefined =
    undefined;
function getAllCountriesAsSchema(): { [countryCode: string]: TypeSchema } {
    // calculate only once using cache
    if (allCountriesAsSchema !== undefined) {
        return allCountriesAsSchema;
    } else {
        const typeBoolean = { type: "boolean" };
        const countriesAsSchema: { [countryCode: string]: TypeSchema } = {};
        for (const countryCode of Object.keys(allCountries)) {
            countriesAsSchema[countryCode] = typeBoolean;
        }
        allCountriesAsSchema = countriesAsSchema;
        return allCountriesAsSchema;
    }
}

export function buildEmailCredential(
    email: string,
    emailCredentialRequest: EmailCredentialRequest,
    sk: SecretKey
): Credential {
    const emailType = getTypeFromEmail(email);
    const schema = CredentialSchema.essential();
    // TODO: pass schema as param depending on email type (university, company...etc)
    switch (emailCredentialRequest.type) {
        case UniversityType.STUDENT:
            schema.properties[SUBJECT_STR] = {
                type: "object",
                properties: {
                    email: { type: "string" },
                    domain: { type: "string" },
                    type: { type: "string" },
                    typeSpecific: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            campus: { type: "string" },
                            program: { type: "string" },
                            countries: {
                                type: "object",
                                properties: getAllCountriesAsSchema(),
                            },
                            admissionYear: {
                                type: "number",
                                minimum: minStudentYear,
                                multipleOf: 0.1,
                            },
                        },
                    },
                },
            };
            break;
        case UniversityType.ALUM:
            // TODO
            break;
        case UniversityType.FACULTY:
            // TODO
            break;
    }
    const credSchema = new CredentialSchema(schema);

    const builder = new CredentialBuilder();
    builder.schema = credSchema;
    // TODO revocation status and such

    // log.warn(`\n\n\n${{ ...toCredProperties(emailCredentialRequest) }}\n\n\n`);

    const domain = domainFromEmail(email);
    if (domain === undefined) {
        throw new Error(`Unable to get domain from email '${email}'`);
    }

    builder.subject = {
        email: email,
        domain: domain,
        type: WebDomainType[emailType],
        typeSpecific: { ...toCredProperties(emailCredentialRequest) },
    };
    return builder.sign(sk);
}

// interface EmailCredentials {
//     emailCredential: Credential;
//     secretBlindedCredential: BlindedCredential;
// }

// interface EmailCredentialsStr {
//     emailCredential: string;
//     secretBlindedCredential: string;
// }

// async function buildAndSaveEmailCredentials(
//     db: PostgresJsDatabase,
//     email: string,
//     secretBlindedCredentialRequest: BlindedCredentialRequest,
//     sk: SecretKey
// ): Promise<EmailCredentials> {
//     const emailCredential = buildEmailCredential(email, sk);
//     const secretBlindedCredential = buildSecretBlindedCredential(
//         email,
//         secretBlindedCredentialRequest,
//         sk
//     );
//     await db
//         .update(emailTable)
//         .set({
//             emailCredential: JSON.stringify(emailCredential.toJSON()),
//             secretBlindedCredential: JSON.stringify(
//                 secretBlindedCredential.toJSON()
//             ),
//         })
//         .where(eq(emailTable.email, email));
//     return { emailCredential, secretBlindedCredential };
// }

export function parseSecretCredentialRequest(
    blindedCredentialRequestObj: any
): BlindedCredentialRequest {
    return BlindedCredentialRequest.fromJSON(blindedCredentialRequestObj);
    // log.error("Cannot parse blinded credential request", e);
}

// async function getEmailCredentials(
//     db: PostgresJsDatabase,
//     email: string
// ): Promise<EmailCredentialsStr | undefined> {
//     const result = await db
//         .select({
//             emailCredential: emailTable.emailCredential,
//             secretBlindedCredential: emailTable.secretBlindedCredential,
//         })
//         .from(emailTable)
//         .where(eq(emailTable.email, email));
//     if (result.length === 0) {
//         return undefined;
//     } else {
//         console.log("\n\n\n", typeof result[0].emailCredential, "\n\n\n");
//         return {
//             emailCredential: result[0].emailCredential as string,
//             secretBlindedCredential: result[0]
//                 .secretBlindedCredential as string,
//         };
//     }
// }

// /**
//  * If credentials don't already exist, create and return them. Throw bad request error if secretBlindedCredentialRequest is malformed.
//  * If credentials already exist, then simply return them (syncing verification is already done).
//  * **/
// export async function createOrGetEmailCredentials(
//     db: PostgresJsDatabase,
//     email: string,
//     secretBlindedCredentialRequest: object,
//     sk: SecretKey,
//     httpErrors: HttpErrors
// ): Promise<CreateOrGetEmailCredentialsRes> {
//     // check if email is associated with given did
//     const emailCredentials = await getEmailCredentials(db, email);
//     if (emailCredentials === undefined) {
//         // credentials don't exist yet, create them
//         const blindedCredentialRequest = blindedCredentialRequestFromObj(
//             secretBlindedCredentialRequest
//         );
//         if (blindedCredentialRequest === undefined) {
//             throw httpErrors.badRequest("BlindedCredentialRequest is invalid");
//         }
//         const { emailCredential, secretBlindedCredential }: EmailCredentials =
//             await buildAndSaveEmailCredentials(
//                 db,
//                 email,
//                 blindedCredentialRequest,
//                 sk
//             );
//         return {
//             emailCredential: JSON.stringify(emailCredential.toJSON()),
//             secretBlindedCredential: JSON.stringify(
//                 secretBlindedCredential.toJSON()
//             ),
//         };
//     } else {
//         return emailCredentials;
//     }
// }
//
export function hasActiveEmailCredential(
    email: string,
    emailCredentialsPerEmail: EmailCredentialsPerEmail
): boolean {
    if (
        email in emailCredentialsPerEmail &&
        emailCredentialsPerEmail[email].active !== undefined
    ) {
        return true;
    } else {
        return false;
    }
}

export function hasActiveSecretCredential(
    type: SecretCredentialType,
    secretCredentialsPerType: SecretCredentialsPerType
): boolean {
    if (
        type in secretCredentialsPerType &&
        secretCredentialsPerType[type].active !== undefined
    ) {
        return true;
    } else {
        return false;
    }
}

export function addActiveEmailCredential(
    email: string,
    encodedEmailCredential: EmailCredential,
    existingEmailCredentialsPerEmail: EmailCredentialsPerEmail
): EmailCredentialsPerEmail {
    const emailCredentialsPerEmail = { ...existingEmailCredentialsPerEmail };
    if (hasActiveEmailCredential(email, existingEmailCredentialsPerEmail)) {
        log.warn(
            "Replacing active email credential in an object that is not expected to have one"
        );
        emailCredentialsPerEmail[email].active = encodedEmailCredential;
    } else if (email in emailCredentialsPerEmail) {
        emailCredentialsPerEmail[email].active = encodedEmailCredential;
    } else {
        emailCredentialsPerEmail[email] = {
            active: encodedEmailCredential,
            revoked: [],
        };
    }
    return emailCredentialsPerEmail;
}

export function addActiveSecretCredential(
    type: SecretCredentialType,
    secretCredential: SecretCredential,
    existingSecretCredentialsPerType: SecretCredentialsPerType
): SecretCredentialsPerType {
    const secretCredentialsPerType = { ...existingSecretCredentialsPerType };
    if (hasActiveSecretCredential(type, existingSecretCredentialsPerType)) {
        log.warn(
            "Replacing active secret credential in an object that is not expected to have one"
        );
        secretCredentialsPerType[type].active = secretCredential;
    } else if (type in secretCredentialsPerType) {
        secretCredentialsPerType[type].active = secretCredential;
    } else {
        secretCredentialsPerType[type] = {
            active: secretCredential,
            revoked: [],
        };
    }
    return secretCredentialsPerType;
}

export interface EssecPersona {
    type?: UniversityType;
    campus?: EssecCampus;
    program?: EssecProgram;
    countries?: Countries;
    admissionYear?: number;
}

export interface PostAs {
    domain: string;
    type: string;
    typeSpecific?: EssecPersona;
}

export function revealedAttributesToPostAs(attributesRevealed: object): PostAs {
    if (!(SUBJECT_STR in attributesRevealed)) {
        throw new Error(`No ${SUBJECT_STR} in revealed attributes`);
    }
    const subjectAttrs = attributesRevealed[SUBJECT_STR] as any;
    if (
        !(
            "domain" in subjectAttrs ||
            typeof subjectAttrs["domain"] !== "string"
        )
    ) {
        throw new Error(`No 'domain' in revealed attributes`);
    }
    if (!("type" in subjectAttrs || typeof subjectAttrs["type"] !== "string")) {
        throw new Error(`No 'type' in revealed attributes`);
    }
    const postAs: PostAs = {
        domain: subjectAttrs["domain"] as string,
        type: subjectAttrs["type"] as string,
    };
    if ("typeSpecific" in subjectAttrs) {
        const typeSpecificAttrs = subjectAttrs["typeSpecific"] as any;
        if (typeof typeSpecificAttrs !== "object") {
            throw new Error(
                `'typeSpecific' in revealed attributes is not an object`
            );
        }
        if ("type" in typeSpecificAttrs) {
            if (typeof typeSpecificAttrs["type"] !== "string") {
                throw new Error(
                    `'typeSpecific.type' in revealed attributes is not a string`
                );
            }
            postAs.typeSpecific = {
                type: universityStringToType(typeSpecificAttrs["type"]),
            };
        }
        if ("campus" in typeSpecificAttrs) {
            if (typeof typeSpecificAttrs["campus"] !== "string") {
                throw new Error(
                    `'typeSpecific.campus' in revealed attributes is not a string`
                );
            }
            if (postAs.typeSpecific === undefined) {
                postAs.typeSpecific = {
                    campus: essecCampusStrToEnum(typeSpecificAttrs["campus"]),
                };
            } else {
                postAs.typeSpecific.campus = essecCampusStrToEnum(
                    typeSpecificAttrs["campus"]
                );
            }
        }
        if ("program" in typeSpecificAttrs) {
            if (typeof typeSpecificAttrs["program"] !== "string") {
                throw new Error(
                    `'typeSpecific.program' in revealed attributes is not a string`
                );
            }
            if (postAs.typeSpecific === undefined) {
                postAs.typeSpecific = {
                    program: essecProgramStrToEnum(
                        typeSpecificAttrs["program"]
                    ),
                };
            } else {
                postAs.typeSpecific.program = essecProgramStrToEnum(
                    typeSpecificAttrs["program"]
                );
            }
        }
        if ("countries" in typeSpecificAttrs) {
            if (typeof typeSpecificAttrs["countries"] !== "object") {
                throw new Error(
                    `'typeSpecific.countries' in revealed attributes is not an object`
                );
            }
            if (postAs.typeSpecific === undefined) {
                postAs.typeSpecific = {
                    countries: typeSpecificAttrs["countries"],
                };
            } else {
                postAs.typeSpecific.countries = typeSpecificAttrs["countries"];
            }
        }
        if ("admissionYear" in typeSpecificAttrs) {
            if (typeof typeSpecificAttrs["admissionYear"] !== "number") {
                throw new Error(
                    `'typeSpecific.admissionYear' in revealed attributes is not a number`
                );
            }
            if (postAs.typeSpecific === undefined) {
                postAs.typeSpecific = {
                    admissionYear: typeSpecificAttrs["admissionYear"],
                };
            } else {
                postAs.typeSpecific.admissionYear =
                    typeSpecificAttrs["admissionYear"];
            }
        }
    }
    return postAs;
}